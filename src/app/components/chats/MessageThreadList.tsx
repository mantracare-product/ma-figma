import React, { useEffect, useRef } from "react";
import { Check, CheckCheck, Reply, FileText, Download } from "lucide-react";
import { Message } from "../../../lib/useConversations";
import { Tooltip } from "../ui/Tooltip";

export interface MessageThreadListProps {
  messages: Message[];
  emptyMessage?: string;
  onReply?: (msg: Message) => void;
}

function formatChatTimestamp(ts?: string) {
  if (!ts) return "";
  if (ts.includes("T") && (ts.endsWith("Z") || ts.includes("+") || ts.includes("-"))) {
    try {
      const d = new Date(ts);
      if (!isNaN(d.getTime())) {
        return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
      }
    } catch {}
  }
  return ts;
}

export default function MessageThreadList({
  messages = [],
  emptyMessage = "No messages in this conversation yet.",
  onReply,
}: MessageThreadListProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [messages.length]);

  return (
    <div
      ref={containerRef}
      className="flex-1 overflow-y-auto p-6 bg-[#fafafa] space-y-3.5"
    >
      {messages.length === 0 ? (
        <div className="text-center py-12 text-slate-400 text-sm italic">
          {emptyMessage}
        </div>
      ) : (
        messages.map((msg) => {
          const isMe = msg.sender === "me";
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
                      className="opacity-0 group-hover:opacity-100 p-1 text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 rounded-md transition-opacity cursor-pointer shrink-0"
                    >
                      <Reply className="w-3.5 h-3.5" />
                    </button>
                  </Tooltip>
                )}

                <div
                  className={`rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                    isMe
                      ? "bg-[#1456f0] text-white rounded-br-xs shadow-xs"
                      : "bg-white text-[#1E293B] border border-gray-200/90 rounded-bl-xs shadow-2xs"
                  }`}
                >
                  {/* Replied-To Quote Banner */}
                  {msg.replyTo && (
                    <div
                      className={`mb-2 p-2 rounded-lg text-xs border-l-2 ${
                        isMe
                          ? "bg-white/15 border-white/80 text-white"
                          : "bg-slate-50 border-[#1456f0] text-slate-700"
                      }`}
                    >
                      <p className="font-bold text-[11px] mb-0.5">{msg.replyTo.senderName}</p>
                      <p className="line-clamp-2 opacity-90 text-[11px] italic">"{msg.replyTo.text}"</p>
                    </div>
                  )}

                  {/* Optional Header */}
                  {msg.header && msg.header.type !== "none" && (
                    <div className="mb-2 pb-1.5 border-b border-current/20 text-xs font-semibold">
                      {msg.header.type === "text" && msg.header.text}
                      {msg.header.type === "image" && (
                        <div className="bg-black/10 p-2 rounded text-xs font-normal">📷 [Image Attached]</div>
                      )}
                      {msg.header.type === "document" && (
                        <div className="bg-black/10 p-2 rounded text-xs font-normal">📄 {msg.header.fileName || "Document"}</div>
                      )}
                    </div>
                  )}

                  {/* Attachment Card */}
                  {msg.attachment && (
                    <div
                      className={`mb-2.5 p-2.5 rounded-xl flex items-center justify-between gap-3 border ${
                        isMe
                          ? "bg-white/15 border-white/30 text-white"
                          : "bg-slate-50 border-gray-200 text-slate-900"
                      }`}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <FileText className={`w-4 h-4 shrink-0 ${isMe ? "text-white" : "text-[#1456f0]"}`} />
                        <div className="min-w-0">
                          <p className="text-xs font-bold truncate">{msg.attachment.name}</p>
                          <p className={`text-[10px] font-mono tabular-nums ${isMe ? "text-blue-100" : "text-slate-400"}`}>
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
                            isMe ? "hover:bg-white/20 text-white" : "hover:bg-slate-200 text-slate-600"
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
                    <div className="mt-2 pt-2 border-t border-current/20 flex flex-wrap gap-1">
                      {msg.buttons.map((btn, bIdx) => (
                        <span
                          key={bIdx}
                          className="px-2 py-0.5 bg-white/20 text-xs rounded-lg font-medium inline-block"
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
                    className={`flex items-center justify-end gap-1 mt-1 text-[10px] font-mono tabular-nums ${
                      isMe ? "text-blue-100/90" : "text-slate-400"
                    }`}
                  >
                    <span>{formatChatTimestamp(msg.timestamp)}</span>
                    {isMe && (
                      <span>
                        {msg.status === "read" ? (
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
                      className="opacity-0 group-hover:opacity-100 p-1 text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 rounded-md transition-opacity cursor-pointer shrink-0"
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
