import React, { useEffect, useRef } from "react";
import { Check, CheckCheck, Reply, FileText, Download } from "lucide-react";
import { Message } from "../../../lib/useConversations";
import { Tooltip } from "../ui/Tooltip";
import { useAuth } from "../../context/AuthContext";

export interface MessageThreadListProps {
  messages: Message[];
  emptyMessage?: string;
  onReply?: (msg: Message) => void;
  channel?: string;
}

const WHATSAPP_WALLPAPER_STYLE: React.CSSProperties = {
  backgroundColor: "#efeae2",
  backgroundImage: `url("data:image/svg+xml,%3Csvg width='120' height='120' viewBox='0 0 120 120' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' stroke='%23bfb4a3' stroke-width='1.1' stroke-opacity='0.32' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M18 22h14a4 4 0 0 1 4 4v8a4 4 0 0 1-4 4H23l-5 4v-4a4 4 0 0 1-4-4v-8a4 4 0 0 1 4-4z'/%3E%3Ccircle cx='78' cy='24' r='7'/%3E%3Cpath d='M75.5 23h.01M80.5 23h.01M75 26.5c1 1.3 5 1.3 6 0'/%3E%3Cpath d='M22 72l4-4 6 6-4 4c-3-1-5-3-6-6z'/%3E%3Cpath d='M84 68l10-4-4 10-2-4-4-2z'/%3E%3Ccircle cx='50' cy='52' r='4'/%3E%3Cpath d='M48 92c2-3 6-3 8 0s6 3 8 0'/%3E%3Cpath d='M98 96a6 6 0 1 1-6-6'/%3E%3Cpath d='M14 96l3-3m0 3l-3-3'/%3E%3Cpath d='M54 14l2 4 4 1-3 3 1 4-4-2-4 2 1-4-3-3 4-1z'/%3E%3C/g%3E%3C/svg%3E")`,
};

function formatChatTimestamp(ts?: string) {
  if (!ts) return "";
  if (ts.includes("T") && (ts.endsWith("Z") || ts.includes("+") || ts.includes("-"))) {
    try {
      const d = new Date(ts);
      if (!isNaN(d.getTime())) {
        return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
      }
    } catch { }
  }
  return ts;
}

export default function MessageThreadList({
  messages = [],
  emptyMessage = "No messages in this conversation yet.",
  onReply,
  channel,
}: MessageThreadListProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const { user } = useAuth();
  const isWhatsApp = channel === "whatsapp";

  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [messages.length]);

  return (
    <div
      ref={containerRef}
      style={isWhatsApp ? WHATSAPP_WALLPAPER_STYLE : undefined}
      className={`flex-1 overflow-y-auto p-6 ${isWhatsApp ? "space-y-2.5" : "bg-[#fafafa] space-y-3.5"}`}
    >
      {messages.length === 0 ? (
        <div className={`text-center py-12 text-sm italic ${isWhatsApp ? "text-[#667781]" : "text-slate-400"}`}>
          {emptyMessage}
        </div>
      ) : (
        messages.map((msg) => {
          const isMe = user
            ? (msg.senderId && String(msg.senderId) === String(user.id)) ||
              (msg.senderEmail && user.email && msg.senderEmail.toLowerCase() === user.email.toLowerCase()) ||
              (msg.senderName && user.name && msg.senderName.toLowerCase() === user.name.toLowerCase()) ||
              (!msg.senderId && !msg.senderName && msg.sender === "me")
            : msg.sender === "me";
          return (
            <div
              key={msg.id}
              className={`group flex flex-col ${isMe ? "items-end" : "items-start"}`}
            >
              {/* Group sender name if not me and senderName exists */}
              {!isMe && msg.senderName && (
                <span className="text-[10px] font-bold text-slate-500 mb-1 px-1">
                  {msg.senderName}
                </span>
              )}

              <div className="flex items-center gap-2 max-w-[85%]">
                {isMe && onReply && (
                  <Tooltip content="Reply to message">
                    <button
                      type="button"
                      onClick={() => onReply(msg)}
                      className="opacity-0 group-hover:opacity-100 p-1 text-slate-500 hover:text-slate-700 hover:bg-black/5 rounded-full transition-opacity cursor-pointer shrink-0"
                    >
                      <Reply className="w-3.5 h-3.5" />
                    </button>
                  </Tooltip>
                )}

                <div
                  className={
                    isWhatsApp
                      ? `rounded-xl px-3.5 py-2 text-[13.5px] leading-relaxed shadow-[0_1px_0.5px_rgba(11,20,26,0.13)] ${
                          isMe
                            ? "bg-[#d9fdd3] text-[#111b21] rounded-tr-xs"
                            : "bg-white text-[#111b21] rounded-tl-xs"
                        }`
                      : `rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                          isMe
                            ? "bg-[#1456f0] text-white rounded-br-xs shadow-xs"
                            : "bg-white text-[#1E293B] border border-gray-200/90 rounded-bl-xs shadow-2xs"
                        }`
                  }
                >
                  {/* Replied-To Quote Banner */}
                  {msg.replyTo && (
                    <div
                      className={`mb-2 p-2 rounded-lg text-xs ${
                        isWhatsApp
                          ? `bg-black/5 border-l-4 ${isMe ? "border-[#06cf9c]" : "border-[#00a884]"} text-[#111b21]`
                          : isMe
                          ? "bg-white/15 border-l-2 border-white/80 text-white"
                          : "bg-slate-50 border-l-2 border-[#1456f0] text-slate-700"
                      }`}
                    >
                      <p className="font-bold text-[11px] mb-0.5">{msg.replyTo.senderName}</p>
                      <p className="line-clamp-2 opacity-90 text-[11px] italic">"{msg.replyTo.text}"</p>
                    </div>
                  )}

                  {/* Optional Header */}
                  {msg.header && msg.header.type !== "none" && (
                    <div className="mb-2 pb-1.5 border-b border-current/15 text-xs font-semibold">
                      {msg.header.type === "text" && msg.header.text}
                      {msg.header.type === "image" && (
                        <div className="bg-black/5 p-2 rounded text-xs font-normal">📷 [Image Attached]</div>
                      )}
                      {msg.header.type === "document" && (
                        <div className="bg-black/5 p-2 rounded text-xs font-normal">📄 {msg.header.fileName || "Document"}</div>
                      )}
                    </div>
                  )}

                  {/* Attachment Card */}
                  {msg.attachment && (
                    <div
                      className={`mb-2 p-2.5 rounded-lg flex items-center justify-between gap-3 border ${
                        isWhatsApp
                          ? "bg-black/5 border-black/10 text-[#111b21]"
                          : isMe
                          ? "bg-white/15 border-white/30 text-white rounded-xl"
                          : "bg-slate-50 border-gray-200 text-slate-900 rounded-xl"
                      }`}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <FileText
                          className={`w-4 h-4 shrink-0 ${
                            isWhatsApp ? "text-[#008069]" : isMe ? "text-white" : "text-[#1456f0]"
                          }`}
                        />
                        <div className="min-w-0">
                          <p className="text-xs font-bold truncate">{msg.attachment.name}</p>
                          <p
                            className={`text-[10px] font-mono tabular-nums ${
                              isWhatsApp ? "text-[#667781]" : isMe ? "text-blue-100" : "text-slate-400"
                            }`}
                          >
                            {msg.attachment.size}
                          </p>
                        </div>
                      </div>
                      <Tooltip content="Download attachment">
                        <a
                          href={msg.attachment.url || "#"}
                          download={msg.attachment.name}
                          onClick={(e) => {
                            if (!msg.attachment?.url) {
                              e.preventDefault();
                              // Simple simulated download
                              alert(`Downloading ${msg.attachment?.name}`);
                            }
                          }}
                          className={`p-1.5 rounded-lg transition-colors cursor-pointer shrink-0 ${
                            isWhatsApp
                              ? "hover:bg-black/10 text-[#54656f]"
                              : isMe
                              ? "hover:bg-white/20 text-white"
                              : "hover:bg-slate-200 text-slate-600"
                          }`}
                        >
                          <Download className="w-3.5 h-3.5" />
                        </a>
                      </Tooltip>
                    </div>
                  )}

                  {msg.text && <p className="whitespace-pre-wrap">{msg.text}</p>}

                  {/* Buttons if template or bot message */}
                  {msg.buttons && msg.buttons.length > 0 && (
                    <div className="mt-2 pt-2 border-t border-current/15 flex flex-wrap gap-1">
                      {msg.buttons.map((btn, bIdx) => (
                        <span
                          key={bIdx}
                          className={`px-2 py-0.5 text-xs rounded-lg font-medium inline-block ${
                            isWhatsApp ? "bg-black/5 text-[#008069]" : "bg-white/20"
                          }`}
                        >
                          {btn.label}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Footer text if template */}
                  {msg.footerText && (
                    <p className="mt-1 text-[11px] opacity-75 italic">{msg.footerText}</p>
                  )}

                  {/* Timestamp & Receipt Status */}
                  <div
                    className={`flex items-center justify-end gap-1 mt-1 tabular-nums ${
                      isWhatsApp
                        ? "text-[11px] text-[#667781]"
                        : `text-[10px] font-mono ${isMe ? "text-blue-100/90" : "text-slate-400"}`
                    }`}
                  >
                    <span>{formatChatTimestamp(msg.timestamp)}</span>
                    {isMe && (
                      <span>
                        {isWhatsApp ? (
                          msg.status === "read" ? (
                            <CheckCheck className="w-3.5 h-3.5 text-[#53bdeb]" />
                          ) : msg.status === "delivered" ? (
                            <CheckCheck className="w-3.5 h-3.5 text-[#667781]" />
                          ) : (
                            <Check className="w-3.5 h-3.5 text-[#667781]" />
                          )
                        ) : msg.status === "read" ? (
                          <CheckCheck className="w-3.5 h-3.5 text-blue-200" />
                        ) : (
                          <Check className="w-3.5 h-3.5 text-blue-200/80" />
                        )}
                      </span>
                    )}
                  </div>
                </div>

                {!isMe && onReply && (
                  <Tooltip content="Reply to message">
                    <button
                      type="button"
                      onClick={() => onReply(msg)}
                      className="opacity-0 group-hover:opacity-100 p-1 text-slate-500 hover:text-slate-700 hover:bg-black/5 rounded-full transition-opacity cursor-pointer shrink-0"
                    >
                      <Reply className="w-3.5 h-3.5" />
                    </button>
                  </Tooltip>
                )}
              </div>
            </div>
          );
        })
      )}
    </div>
  );
}
