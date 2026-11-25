import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router";
import {
  Bell,
  BellRing,
  CheckSquare,
  MessageCircle,
  Receipt,
  Settings,
  Check,
  Trash2,
  X,
  Info,
  Calendar,
  Sparkles,
  Send,
  ExternalLink,
} from "lucide-react";
import { useNotifications } from "../../../lib/notificationsStore";
import { Tooltip } from "../ui/Tooltip";
import { InAppNotification, NotificationType } from "../../../types/notification";
import { useAuth } from "../../context/AuthContext";
import { useTeamMembers } from "../../../lib/teamStore";
import {
  getAllReminders,
  subscribeToAllReminders,
  isReminderForMember,
  ReminderActivityEntry,
  ReminderAssignee,
  formatTimestamp,
} from "../../../lib/activityEngine";
import {
  toggleReminderDone,
  addReminderComment,
  extractMentionedMembers,
  formatReminderDateDisplay,
  isReminderOverdue,
} from "../../../lib/reminderActions";
import ReminderMentionInput, { renderTextWithMentions } from "../activity/ReminderMentionInput";
import { toast } from "sonner";

export interface NotificationDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  anchorRef?: React.RefObject<HTMLElement | null>;
}

export default function NotificationDrawer({ isOpen, onClose, anchorRef }: NotificationDrawerProps) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { teamMembers } = useTeamMembers();
  const { notifications, unreadCount, markAsRead, markAllAsRead, clearAll } = useNotifications();
  const popupRef = useRef<HTMLDivElement>(null);

  const [filter, setFilter] = useState<"all" | "unread" | "reminders">("all");
  const [reminders, setReminders] = useState<ReminderActivityEntry[]>(() => getAllReminders());
  const [commentDrafts, setCommentDrafts] = useState<Record<string, string>>({});
  const [commentMentionsMap, setCommentMentionsMap] = useState<Record<string, ReminderAssignee[]>>({});
  const [showHowInfo, setShowHowInfo] = useState(false);
  const [isFooterDismissed, setIsFooterDismissed] = useState(() => {
    if (typeof window === "undefined") return false;
    return sessionStorage.getItem("mantra_dismiss_push_footer") === "true";
  });

  useEffect(() => {
    setReminders(getAllReminders());
    return subscribeToAllReminders(setReminders);
  }, []);

  const relevantReminders = reminders.filter((r) => {
    const isForMe = isReminderForMember(r, user);
    const isByMe =
      (user?.id && r.createdById && String(user.id) === String(r.createdById)) ||
      (user?.name && r.createdByName && user.name.toLowerCase() === r.createdByName.toLowerCase());
    return isForMe || isByMe;
  });

  const pendingForMeCount = reminders.filter(
    (r) => r.status !== "completed" && isReminderForMember(r, user)
  ).length;

  // Close on outside click
  useEffect(() => {
    if (!isOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      if (
        popupRef.current &&
        !popupRef.current.contains(target) &&
        (!anchorRef?.current || !anchorRef.current.contains(target))
      ) {
        onClose();
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };

    window.addEventListener("mousedown", handleClickOutside);
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("mousedown", handleClickOutside);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, onClose, anchorRef]);

  if (!isOpen) return null;

  const filtered = notifications.filter((n) => {
    if (filter === "unread") return !n.read;
    return true;
  });

  const getNotificationIcon = (type: NotificationType) => {
    switch (type) {
      case "task":
        return <CheckSquare className="w-4 h-4 text-blue-600" />;
      case "chat":
        return <MessageCircle className="w-4 h-4 text-emerald-600" />;
      case "billing":
        return <Receipt className="w-4 h-4 text-amber-600" />;
      case "reminder":
        return <BellRing className="w-4 h-4 text-amber-600" />;
      default:
        return <Bell className="w-4 h-4 text-slate-600" />;
    }
  };

  const handleNotificationClick = (item: InAppNotification) => {
    markAsRead(item.id);
    onClose();
    if (item.link) {
      if (typeof window !== "undefined" && window.location.pathname.startsWith("/patient")) {
        if (item.link.startsWith("/tasks")) {
          navigate("/patient/tasks");
          return;
        }
        if (item.link.startsWith("/chats")) {
          navigate("/patient/messages");
          return;
        }
      }
      navigate(item.link);
    }
  };

  const handleDismissFooter = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsFooterDismissed(true);
    if (typeof window !== "undefined") {
      sessionStorage.setItem("mantra_dismiss_push_footer", "true");
    }
  };

  return (
    <div
      ref={popupRef}
      role="dialog"
      aria-label="Notifications"
      className="absolute right-0 top-full mt-2 w-[380px] max-w-[calc(100vw-24px)] bg-white rounded-2xl shadow-2xl border border-gray-200/90 z-[1000] overflow-hidden flex flex-col text-left animate-in fade-in zoom-in-95 duration-150 select-none"
      style={{ fontFamily: "DM Sans, sans-serif" }}
    >
      {/* ── Header ── */}
      <div className="p-3.5 px-4 border-b border-gray-100 flex items-center justify-between bg-white">
        <div className="flex items-center gap-2">
          <h3
            className="text-sm font-bold text-slate-900 tracking-tight"
            style={{ fontFamily: "Outfit, sans-serif" }}
          >
            Notifications
          </h3>
          {unreadCount > 0 && (
            <span className="min-w-[18px] h-4 px-1.5 rounded-full bg-[#1456f0] text-white text-[10px] font-mono tabular-nums font-bold flex items-center justify-center">
              {unreadCount}
            </span>
          )}
        </div>

        <div className="flex items-center gap-1.5">
          {unreadCount > 0 && (
            <Tooltip content="Mark all as read">
              <button
                type="button"
                onClick={markAllAsRead}
                className="text-[11px] text-slate-500 hover:text-slate-800 hover:underline cursor-pointer flex items-center gap-1 font-semibold px-1.5 py-1"
              >
                <Check className="w-3.5 h-3.5 text-slate-400" />
                <span>Mark read</span>
              </button>
            </Tooltip>
          )}

          {notifications.length > 0 && (
            <Tooltip content="Clear history">
              <button
                type="button"
                onClick={clearAll}
                className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                aria-label="Clear all notifications"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </Tooltip>
          )}

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer ml-0.5"
            aria-label="Close"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* ── Subheader Filter Tabs: All / Unread / Reminders ── */}
      <div className="p-2 px-3 bg-slate-50/70 border-b border-gray-100 flex items-center gap-1.5">
        <button
          type="button"
          onClick={() => setFilter("all")}
          className={`px-3 py-1 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
            filter === "all"
              ? "bg-[#1E293B] text-white shadow-2xs"
              : "text-slate-600 hover:bg-slate-200/60"
          }`}
        >
          All
        </button>
        <button
          type="button"
          onClick={() => setFilter("unread")}
          className={`px-3 py-1 text-xs font-semibold rounded-lg transition-colors cursor-pointer flex items-center gap-1.5 ${
            filter === "unread"
              ? "bg-[#1E293B] text-white shadow-2xs"
              : "text-slate-600 hover:bg-slate-200/60"
          }`}
        >
          <span>Unread</span>
          {unreadCount > 0 && (
            <span
              className={`text-[10px] font-mono tabular-nums px-1.5 py-0.2 rounded-full ${
                filter === "unread" ? "bg-white/20 text-white" : "bg-slate-200 text-slate-700"
              }`}
            >
              {unreadCount}
            </span>
          )}
        </button>
        <button
          type="button"
          onClick={() => setFilter("reminders")}
          className={`px-3 py-1 text-xs font-semibold rounded-lg transition-colors cursor-pointer flex items-center gap-1.5 ${
            filter === "reminders"
              ? "bg-[#1E293B] text-white shadow-2xs"
              : "text-slate-600 hover:bg-slate-200/60"
          }`}
        >
          <span>Reminders</span>
          {pendingForMeCount > 0 && (
            <span
              className={`text-[10px] font-mono tabular-nums px-1.5 py-0.2 rounded-full ${
                filter === "reminders" ? "bg-white/20 text-white" : "bg-amber-100 text-amber-800"
              }`}
            >
              {pendingForMeCount}
            </span>
          )}
        </button>
      </div>

      {/* ── Scrollable Notification / Reminders List ── */}
      <div className="max-h-[380px] overflow-y-auto divide-y divide-gray-100">
        {filter === "reminders" ? (
          relevantReminders.length === 0 ? (
            <div className="py-12 px-6 text-center space-y-2">
              <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-500 mx-auto flex items-center justify-center">
                <BellRing className="w-5 h-5" />
              </div>
              <p className="text-xs font-medium text-slate-600">No reminders yet</p>
              <p className="text-[11px] text-slate-400">
                Reminders assigned to you via @mention in client activity will appear here.
              </p>
            </div>
          ) : (
            relevantReminders.map((rem) => {
              const isDone = rem.status === "completed";
              const overdue = isReminderOverdue(rem.reminderDate, rem.reminderTime, rem.status);
              const dateDisplay = formatReminderDateDisplay(rem.reminderDate, rem.reminderTime);
              const isForMe = isReminderForMember(rem, user);
              const draft = commentDrafts[rem.id] || "";
              const comments = rem.comments || [];

              const submitDrawerComment = () => {
                const trimmed = draft.trim();
                if (!trimmed) return;
                const mentions = extractMentionedMembers(
                  trimmed,
                  teamMembers,
                  commentMentionsMap[rem.id] || []
                );
                const updated = addReminderComment(rem.id, trimmed, user, mentions);
                if (updated) {
                  setReminders(getAllReminders());
                  setCommentDrafts((prev) => ({ ...prev, [rem.id]: "" }));
                  setCommentMentionsMap((prev) => ({ ...prev, [rem.id]: [] }));
                  toast.success("Comment added to reminder");
                }
              };

              return (
                <div key={rem.id} className="p-3.5 px-4 space-y-2 bg-white hover:bg-slate-50/60 transition-colors">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {isForMe && (
                          <span className="text-[10px] font-bold px-1.5 py-0.2 rounded-full bg-blue-50 text-blue-700 border border-blue-200/70">
                            For you
                          </span>
                        )}
                        <span
                          className={`text-[10px] font-semibold px-1.5 py-0.2 rounded-full ${
                            isDone
                              ? "bg-emerald-50 text-emerald-700"
                              : overdue
                              ? "bg-red-50 text-red-700"
                              : "bg-amber-50 text-amber-800"
                          }`}
                        >
                          {isDone ? "Done" : overdue ? "Overdue" : "Pending"}
                        </span>
                        {rem.clientName && (
                          <button
                            type="button"
                            onClick={() => {
                              onClose();
                              if (rem.clientId) navigate(`/clients/${rem.clientId}`);
                            }}
                            className="inline-flex items-center gap-0.5 text-[11px] font-bold text-slate-800 hover:text-[#1456f0] cursor-pointer truncate"
                          >
                            <span>{rem.clientName}</span>
                            <ExternalLink className="w-2.5 h-2.5 shrink-0" />
                          </button>
                        )}
                      </div>
                      {dateDisplay && (
                        <p className="text-[10px] text-slate-500 mt-1 flex items-center gap-1">
                          <Calendar className="w-3 h-3 text-slate-400" />
                          <span>{dateDisplay}</span>
                          {rem.createdByName && <span>· by {rem.createdByName}</span>}
                        </p>
                      )}
                    </div>

                    {!isDone && (
                      <button
                        type="button"
                        onClick={() => {
                          const updated = toggleReminderDone(rem.id, user);
                          if (updated) {
                            setReminders(getAllReminders());
                            toast.success("Reminder marked as done");
                          }
                        }}
                        className="px-2 py-1 rounded-lg text-[10px] font-semibold flex items-center gap-1 cursor-pointer shrink-0 transition-colors bg-[#1E293B] text-white hover:bg-black"
                      >
                        <Check className="w-3 h-3" />
                        <span>Mark Done</span>
                      </button>
                    )}
                  </div>

                  <p className={`text-xs leading-snug ${isDone ? "line-through text-slate-400" : "text-slate-800"}`}>
                    {renderTextWithMentions(rem.reminderNote, rem.assignedMembers, teamMembers)}
                  </p>

                  {comments.length > 0 && (
                    <div className="space-y-1 pl-2 border-l-2 border-slate-200">
                      {comments.slice(-2).map((c) => (
                        <div key={c.id} className="text-[11px] text-slate-600">
                          <span className="font-semibold text-slate-800">{c.authorName}: </span>
                          <span>{renderTextWithMentions(c.text, c.mentions || rem.assignedMembers, teamMembers)}</span>
                          <span className="text-[9px] text-slate-400 ml-1">({formatTimestamp(c.createdAt)})</span>
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="flex items-center gap-1.5 pt-0.5">
                    <div className="flex-1 min-w-0">
                      <ReminderMentionInput
                        value={draft}
                        onChange={(val) => setCommentDrafts((prev) => ({ ...prev, [rem.id]: val }))}
                        teamMembers={teamMembers}
                        currentUserId={user?.id}
                        currentUserName={user?.name}
                        onSelectMember={(member) => {
                          setCommentMentionsMap((prev) => {
                            const curr = prev[rem.id] || [];
                            if (curr.some((m) => String(m.id) === String(member.id))) return prev;
                            return { ...prev, [rem.id]: [...curr, member] };
                          });
                        }}
                        placeholder="Add comment..."
                        multiline={false}
                        dropdownDirection="up"
                        onSubmit={submitDrawerComment}
                      />
                    </div>
                    <button
                      type="button"
                      onClick={submitDrawerComment}
                      className="p-1.5 rounded-lg border border-gray-200 bg-white hover:bg-gray-100 text-slate-700 cursor-pointer shrink-0"
                      title="Post comment"
                      aria-label="Post comment"
                    >
                      <Send className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              );
            })
          )
        ) : filtered.length === 0 ? (
          <div className="py-12 px-6 text-center space-y-2">
            <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-400 mx-auto flex items-center justify-center">
              <Bell className="w-5 h-5 text-slate-400" />
            </div>
            <p className="text-xs font-medium text-slate-600">No notifications</p>
            <p className="text-[11px] text-slate-400">You're completely caught up with all updates.</p>
          </div>
        ) : (
          filtered.map((item) => {
            const isPatientPortal =
              typeof window !== "undefined" && window.location.pathname.startsWith("/patient");
            const displayTitle = isPatientPortal
              ? item.title.replace(/\bTSK-\d+\b[:\s-]*/gi, "").trim()
              : item.title;
            const displayMessage = isPatientPortal
              ? item.message.replace(/\bTSK-\d+\b[:\s-]*/gi, "").trim()
              : item.message;

            return (
              <div
                key={item.id}
                onClick={() => handleNotificationClick(item)}
                className={`p-3.5 px-4 flex items-start gap-3 transition-colors cursor-pointer ${
                  item.read ? "bg-white hover:bg-slate-50" : "bg-blue-50/30 hover:bg-blue-50/60"
                }`}
              >
                <div className="w-8 h-8 rounded-lg bg-slate-100 border border-slate-200/80 flex items-center justify-center shrink-0 mt-0.5">
                  {getNotificationIcon(item.type)}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2 mb-0.5">
                    <h4 className="text-xs font-bold text-slate-900 truncate">{displayTitle}</h4>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <span className="text-[10px] font-mono tabular-nums text-slate-400">
                        {item.timestamp}
                      </span>
                      {!item.read && <span className="w-1.5 h-1.5 rounded-full bg-[#1456f0]" />}
                    </div>
                  </div>
                  <p className="text-xs text-slate-600 leading-snug line-clamp-2">{displayMessage}</p>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* ── Footer Strip ── */}
      {!isFooterDismissed && (
        <div className="bg-slate-50 border-t border-gray-100 p-2.5 px-3.5 flex flex-col gap-1.5">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[11px] text-slate-600 font-medium truncate">
              Get alerts while MantraAssist is open in the background
            </span>
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => setShowHowInfo((prev) => !prev)}
                className="text-[11px] font-bold text-[#1456f0] hover:underline cursor-pointer"
              >
                How?
              </button>
              <button
                type="button"
                onClick={handleDismissFooter}
                className="text-[11px] font-semibold text-slate-500 hover:text-slate-800 cursor-pointer"
              >
                Got it
              </button>
            </div>
          </div>

          {showHowInfo && (
            <div className="p-2 bg-white rounded-lg border border-slate-200/80 text-[11px] text-slate-600 animate-in fade-in duration-100 flex items-start gap-1.5">
              <Info className="w-3.5 h-3.5 text-[#1456f0] shrink-0 mt-0.5" />
              <span>
                Enable native desktop notifications in{" "}
                <strong
                  onClick={() => {
                    onClose();
                    navigate("/settings/notifications");
                  }}
                  className="text-[#1456f0] underline cursor-pointer"
                >
                  Settings → Notifications
                </strong>{" "}
                to receive alerts when working in other tabs.
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
