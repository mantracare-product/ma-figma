import React, { useEffect, useRef } from "react";
import { Check, CheckCheck } from "lucide-react";
import { Message } from "../../../lib/useConversations";

export interface MessageThreadListProps {
  messages: Message[];
  emptyMessage?: string;
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
}: MessageThreadListProps) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  return (
    <div className="flex-1 overflow-y-auto p-6 bg-[#fafafa] space-y-3.5">
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
              className={`flex flex-col ${isMe ? "items-end" : "items-start"}`}
            >
              <div
                className={`max-w-[78%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                  isMe
                    ? "bg-[#1456f0] text-white rounded-br-xs shadow-xs"
                    : "bg-white text-[#1E293B] border border-gray-200/90 rounded-bl-xs shadow-2xs"
                }`}
              >
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

                <p className="whitespace-pre-wrap">{msg.text}</p>

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
            </div>
          );
        })
      )}
      <div ref={bottomRef} />
    </div>
  );
}
