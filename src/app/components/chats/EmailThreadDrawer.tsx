import React, { useState, useEffect } from "react";
import { X, Mail, Send, Clock, User, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { appendActivity, formatTimestamp } from "../../../lib/activityEngine";
import { getActivityForClient } from "../../../lib/activityLog";

export interface EmailThreadDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  clientId?: string;
  clientName?: string;
  clientEmail?: string;
  threadId?: string;
  initialSubject?: string;
}

export interface EmailMessageItem {
  id: string;
  subject: string;
  body: string;
  sender: "me" | "contact";
  timestamp: string;
  toOrFrom?: string;
}

export default function EmailThreadDrawer({
  isOpen,
  onClose,
  clientId,
  clientName,
  clientEmail,
  threadId,
  initialSubject,
}: EmailThreadDrawerProps) {
  const [messages, setMessages] = useState<EmailMessageItem[]>([]);
  const [replySubject, setReplySubject] = useState("");
  const [replyBody, setReplyBody] = useState("");

  const resolvedClientName = clientName || "Client";
  const resolvedClientEmail = clientEmail || "client@email.com";
  const normalizedClientId = clientId ? String(clientId) : "CL-001";

  // Load email thread history when drawer opens or clientId changes
  useEffect(() => {
    if (!isOpen) return;

    // Fetch existing email activity for this client from engine
    const rawActivities = getActivityForClient(normalizedClientId);
    const emailActivities = rawActivities.filter((a) => a.type === "email");

    if (emailActivities.length > 0) {
      const threadMsgs: EmailMessageItem[] = emailActivities.map((act: any) => ({
        id: act.id || `email-${Date.now()}-${Math.random()}`,
        subject: act.subject || act.details?.primary || initialSubject || "Discussion regarding service",
        body: act.bodyPreview || act.details?.primary || "No body content",
        sender: act.direction === "inbound" || act.direction === "received" ? "contact" : "me",
        timestamp: act.timestamp || act.date || new Date().toISOString(),
        toOrFrom: act.toOrFrom || (act.direction === "inbound" ? resolvedClientEmail : "support@mantra.com"),
      }));
      setMessages(threadMsgs.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()));

      const lastSubject = threadMsgs[threadMsgs.length - 1]?.subject || initialSubject || "Follow up";
      setReplySubject(lastSubject.startsWith("Re:") ? lastSubject : `Re: ${lastSubject}`);
    } else {
      // Default seed email thread if no stored activity
      const defaultThread: EmailMessageItem[] = [
        {
          id: "email-seed-1",
          subject: initialSubject || "Welcome & Service Information",
          body: `Hi ${resolvedClientName},\n\nThank you for reaching out to us. Please find details regarding your upcoming onboarding session.\n\nBest regards,\nMantraCare Support Team`,
          sender: "me",
          timestamp: new Date(Date.now() - 86400000).toISOString(),
          toOrFrom: resolvedClientEmail,
        },
        {
          id: "email-seed-2",
          subject: initialSubject || "Re: Welcome & Service Information",
          body: `Hi team,\n\nThanks for the information. I received the details and will prepare the documentation.\n\nBest,\n${resolvedClientName}`,
          sender: "contact",
          timestamp: new Date(Date.now() - 43200000).toISOString(),
          toOrFrom: resolvedClientEmail,
        },
      ];
      setMessages(defaultThread);
      const subj = initialSubject || "Welcome & Service Information";
      setReplySubject(subj.startsWith("Re:") ? subj : `Re: ${subj}`);
    }
  }, [isOpen, normalizedClientId, resolvedClientName, resolvedClientEmail, initialSubject]);

  if (!isOpen) return null;

  const handleSendReply = () => {
    if (!replyBody.trim()) {
      toast.error("Please enter email body content");
      return;
    }

    const subj = replySubject.trim() || "Re: Follow up";
    const body = replyBody.trim();
    const nowIso = new Date().toISOString();

    const created = appendActivity({
      type: "email",
      clientId: normalizedClientId,
      direction: "outbound",
      status: "delivered",
      subject: subj,
      bodyPreview: body,
      toOrFrom: resolvedClientEmail,
      timestamp: nowIso,
      details: {
        primary: subj,
        secondary: `To: ${resolvedClientEmail} (${resolvedClientName})`,
      },
    } as any);

    const newMsg: EmailMessageItem = {
      id: (created as any)?.id || `email-reply-${Date.now()}`,
      subject: subj,
      body: body,
      sender: "me",
      timestamp: nowIso,
      toOrFrom: resolvedClientEmail,
    };

    setMessages((prev) => [...prev, newMsg]);
    setReplyBody("");
    toast.success(`Email reply sent to ${resolvedClientName}`);
  };

  const activeSubject = messages.length > 0 ? messages[messages.length - 1].subject : initialSubject || "Email Conversation";

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-black/40 backdrop-blur-xs flex justify-end transition-opacity">
      <div className="w-full max-w-xl bg-white h-full shadow-2xl flex flex-col animate-in slide-in-from-right duration-300">
        
        {/* Header */}
        <div className="p-4 border-b border-gray-200 bg-white flex items-center justify-between shadow-xs">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-full bg-amber-100 border border-amber-200 text-amber-700 flex items-center justify-center font-bold text-sm flex-shrink-0">
              <Mail className="w-5 h-5 text-amber-600" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-sm text-gray-900 truncate" style={{ fontFamily: "DM Sans, sans-serif" }}>
                  {resolvedClientName}
                </h3>
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
                  Email Thread
                </span>
              </div>
              <p className="text-xs text-gray-500 truncate" style={{ fontFamily: "Outfit, sans-serif" }}>
                {resolvedClientEmail} · <span className="font-medium text-gray-700">{activeSubject}</span>
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors flex-shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Email Thread Message List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50/50">
          {messages.length === 0 ? (
            <div className="text-center py-12 text-gray-400 text-sm italic">
              No emails in this thread yet.
            </div>
          ) : (
            messages.map((msg) => {
              const isMe = msg.sender === "me";
              return (
                <div
                  key={msg.id}
                  className={`p-4 rounded-xl border transition-all ${
                    isMe
                      ? "bg-white border-amber-200/80 shadow-xs ml-6"
                      : "bg-white border-gray-200 shadow-xs mr-6"
                  }`}
                >
                  <div className="flex items-center justify-between pb-2 mb-2 border-b border-gray-100 text-xs">
                    <div className="flex items-center gap-1.5 font-medium text-gray-700">
                      <User className="w-3.5 h-3.5 text-gray-400" />
                      <span>{isMe ? "Sent by You" : resolvedClientName}</span>
                      <span className="text-[11px] text-gray-400">({isMe ? "support@mantra.com" : msg.toOrFrom || resolvedClientEmail})</span>
                    </div>
                    <div className="flex items-center gap-1 text-[11px] text-gray-400">
                      <Clock className="w-3 h-3 text-gray-400" />
                      <span>{formatTimestamp(msg.timestamp)}</span>
                    </div>
                  </div>

                  {msg.subject && (
                    <h4 className="text-xs font-bold text-gray-900 mb-1.5" style={{ fontFamily: "DM Sans, sans-serif" }}>
                      {msg.subject}
                    </h4>
                  )}

                  <p className="text-xs text-gray-700 leading-relaxed whitespace-pre-wrap" style={{ fontFamily: "Outfit, sans-serif" }}>
                    {msg.body}
                  </p>
                </div>
              );
            })
          )}
        </div>

        {/* Composer / Reply Box */}
        <div className="p-4 border-t border-gray-200 bg-white space-y-3 shadow-lg">
          <div className="flex items-center gap-2 text-xs font-semibold text-amber-800 uppercase tracking-wider">
            <Mail className="w-4 h-4 text-amber-600" />
            <span>Reply to Email Thread</span>
          </div>

          <div className="space-y-2">
            <input
              type="text"
              placeholder="Subject line..."
              value={replySubject}
              onChange={(e) => setReplySubject(e.target.value)}
              className="w-full text-xs px-3 py-2 bg-slate-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-all text-gray-800"
              style={{ fontFamily: "Outfit, sans-serif" }}
            />
            <textarea
              rows={3}
              placeholder={`Write email reply for ${resolvedClientName}...`}
              value={replyBody}
              onChange={(e) => setReplyBody(e.target.value)}
              className="w-full text-xs p-3 bg-slate-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-all text-gray-800"
              style={{ fontFamily: "Outfit, sans-serif" }}
            />
          </div>

          <div className="flex items-center justify-between pt-1">
            <span className="text-[11px] text-gray-400" style={{ fontFamily: "Outfit, sans-serif" }}>
              To: {resolvedClientEmail}
            </span>
            <button
              type="button"
              onClick={handleSendReply}
              className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-semibold shadow-sm transition-all flex items-center gap-1.5 cursor-pointer"
              style={{ fontFamily: "Outfit, sans-serif" }}
            >
              <Send className="w-3.5 h-3.5" /> Send Reply
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
