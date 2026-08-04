import React, { useEffect, useRef } from "react";
import { Check, CheckCheck } from "lucide-react";
import { Message } from "../../../lib/useConversations";

export interface MessageThreadListProps {
  messages: Message[];
  emptyMessage?: string;
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
    <div className="flex-1 overflow-y-auto p-6 bg-slate-50 space-y-4">
      {messages.length === 0 ? (
        <div className="text-center py-12 text-gray-400 text-sm italic">
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
                className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm shadow-sm ${
                  isMe
                    ? "bg-blue-600 text-white rounded-br-none"
                    : "bg-white text-gray-800 border border-gray-200 rounded-bl-none"
                }`}
              >
                {/* Optional Header */}
                {msg.header && msg.header.type !== "none" && (
                  <div className="mb-2 pb-2 border-b border-white/20 text-xs font-semibold">
                    {msg.header.type === "text" && msg.header.text}
                    {msg.header.type === "image" && (
                      <div className="bg-black/10 p-2 rounded text-xs font-normal">📷 [Image Attached]</div>
                    )}
                    {msg.header.type === "document" && (
                      <div className="bg-black/10 p-2 rounded text-xs font-normal">📄 {msg.header.fileName || "Document"}</div>
                    )}
                  </div>
                )}

                <p className="whitespace-pre-wrap leading-relaxed">{msg.text}</p>

                {/* Buttons if template or bot message */}
                {msg.buttons && msg.buttons.length > 0 && (
                  <div className="mt-2 pt-2 border-t border-white/20 flex flex-wrap gap-1">
                    {msg.buttons.map((btn, bIdx) => (
                      <span
                        key={bIdx}
                        className="px-2 py-1 bg-white/20 text-xs rounded font-medium inline-block"
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
                  className={`flex items-center justify-end gap-1 mt-1 text-[10px] ${
                    isMe ? "text-blue-100" : "text-gray-400"
                  }`}
                >
                  <span>{msg.timestamp}</span>
                  {isMe && (
                    <span>
                      {msg.status === "read" ? (
                        <CheckCheck className="w-3.5 h-3.5 text-blue-200" />
                      ) : (
                        <Check className="w-3.5 h-3.5" />
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
