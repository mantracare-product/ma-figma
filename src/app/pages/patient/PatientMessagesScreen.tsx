import React, { useState, useMemo, useRef, useEffect } from "react";
import { useOutletContext } from "react-router";
import {
  MessageSquare,
  Users,
  Bot,
  UserCheck,
  Send,
  Paperclip,
  Reply,
  X,
  FileText,
  Download,
  Check,
  CheckCheck,
  Stethoscope,
} from "lucide-react";
import { useConversations, Conversation, Message, MessageAttachment, MessageReplyReference } from "../../../lib/useConversations";
import { Tooltip } from "../../components/ui/Tooltip";
import { toast } from "sonner";

interface OutletContextType {
  activeClient: {
    id: string;
    name: string;
    email?: string;
    phoneNumber?: string;
    location?: string;
  };
}

export default function PatientMessagesScreen() {
  const { activeClient } = useOutletContext<OutletContextType>();
  const { conversations, sendMessage } = useConversations();

  // Find all relevant channels for this client
  const clientConversations = useMemo(() => {
    // 1. Doctor Chat (Direct conversation for this client)
    const doctorChat: Conversation = conversations.find(
      (c) => c.clientId === activeClient.id || (!c.isGroup && c.contactName === activeClient.name)
    ) || {
      id: `doc-${activeClient.id}`,
      clientId: activeClient.id,
      contactName: "Dr. Alistair Mehta",
      phoneNumber: "Primary Care Physician",
      channel: "whatsapp" as const,
      lastMessage: "Your latest blood panel results look very healthy.",
      timestamp: "10:15 AM",
      unreadCount: 0,
      status: "open" as const,
      isGroup: false,
      messages: [
        {
          id: "doc-msg-1",
          text: "Hello Sarah, your fasting blood panel from yesterday has been reviewed.",
          timestamp: "Yesterday, 3:30 PM",
          sender: "contact" as const,
          senderName: "Dr. Alistair Mehta",
          status: "read" as const,
        },
        {
          id: "doc-msg-2",
          text: "Thank you Dr. Mehta! Are there any vitamin supplements I should resume?",
          timestamp: "Yesterday, 4:00 PM",
          sender: "me" as const,
          status: "read" as const,
        },
        {
          id: "doc-msg-3",
          text: "Your latest blood panel results look very healthy. You may resume Vitamin D3 as planned.",
          timestamp: "10:15 AM",
          sender: "contact" as const,
          senderName: "Dr. Alistair Mehta",
          status: "read" as const,
        },
      ],
    };

    // 2. Group Chats this client is part of
    const groupChats: Conversation[] = conversations.filter(
      (c) =>
        c.isGroup &&
        c.groupConfig &&
        (c.groupConfig.memberIds.includes(activeClient.id) ||
          c.groupConfig.memberIds.includes("CL-001") ||
          c.groupConfig.chatType === "public")
    );

    // 3. Care Bot Chat
    const careBotChat: Conversation = {
      id: "care-bot-system",
      contactName: "Care Bot",
      phoneNumber: "AI Health Companion",
      channel: "companion" as const,
      lastMessage: "I'm available 24/7 to answer clinic questions, log vitals, or help book appointments.",
      timestamp: "Always Active",
      unreadCount: 0,
      status: "open" as const,
      isBot: true,
      isGroup: false,
      messages: [
        {
          id: "bot-msg-1",
          text: "Hello! I am your MantraCare AI Health Assistant. How can I help you today?",
          timestamp: "Today",
          sender: "contact" as const,
          senderName: "Care Bot",
          status: "read" as const,
        },
      ],
    };

    return [doctorChat, ...groupChats, careBotChat];
  }, [conversations, activeClient]);

  const [selectedChatId, setSelectedChatId] = useState<string>(() => clientConversations[0]?.id || "care-bot-system");
  const [inputText, setInputText] = useState("");
  const [replyingTo, setReplyingTo] = useState<Message | null>(null);
  const [attachedFile, setAttachedFile] = useState<MessageAttachment | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const activeChat = clientConversations.find((c) => c.id === selectedChatId) || clientConversations[0];

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [activeChat?.messages.length]);

  const handleSend = () => {
    if (!inputText.trim() && !attachedFile) return;

    const replyRef: MessageReplyReference | undefined = replyingTo
      ? {
        id: replyingTo.id,
        text: replyingTo.text,
        senderName: replyingTo.senderName || (replyingTo.sender === "me" ? "Me" : activeChat.contactName),
      }
      : undefined;

    // Dispatch message
    sendMessage(activeChat.id, inputText.trim(), {
      replyTo: replyRef,
      attachment: attachedFile || undefined,
      sender: "me",
      senderName: activeClient.name,
    });

    setInputText("");
    setAttachedFile(null);
    setReplyingTo(null);
  };

  const handleFilePicked = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const sizeStr = file.size > 1024 * 1024
        ? `${(file.size / (1024 * 1024)).toFixed(1)} MB`
        : `${Math.round(file.size / 1024)} KB`;
      setAttachedFile({
        name: file.name,
        size: sizeStr,
        type: file.type || "application/octet-stream",
      });
      toast.success(`Attached "${file.name}"`);
    }
  };

  return (
    <div className="h-full flex overflow-hidden bg-white border border-gray-200/90 rounded-2xl shadow-sm">
      {/* Hidden File Input */}
      <input type="file" ref={fileInputRef} onChange={handleFilePicked} className="hidden" />

      {/* ── Left Sidebar: Patient's Filtered Channels (Doctor, Client Groups, Care Bot ONLY) ── */}
      <div className="w-80 shrink-0 border-r border-gray-200/90 flex flex-col bg-slate-50/50">
        <div className="p-4 border-b border-gray-200/90 bg-white">
          <h2 className="text-sm font-bold text-slate-900" style={{ fontFamily: "Outfit, sans-serif" }}>
            Messages
          </h2>
          <p className="text-[11px] text-slate-500">
            Direct doctor chats, clinical groups & AI assistant
          </p>
        </div>

        <div className="flex-1 overflow-y-auto divide-y divide-gray-100">
          {clientConversations.map((chat: any) => {
            const isSelected = chat.id === selectedChatId;
            const isGroup = Boolean(chat.isGroup);
            const isBot = Boolean(chat.isBot);

            return (
              <div
                key={chat.id}
                onClick={() => setSelectedChatId(chat.id)}
                className={`p-3.5 flex items-start gap-3 cursor-pointer transition-colors border-l-2 ${isSelected ? "bg-blue-50/70 border-l-[#1456f0]" : "border-l-transparent bg-white hover:bg-slate-50"
                  }`}
              >
                {/* Avatar */}
                <div
                  className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-xs shrink-0 shadow-2xs ${isSelected ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-700"
                    }`}
                >
                  {isBot ? (
                    <Bot className="w-4 h-4 text-blue-600" />
                  ) : isGroup ? (
                    <Users className="w-4 h-4" />
                  ) : (
                    <Stethoscope className="w-4 h-4" />
                  )}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-1 mb-0.5">
                    <h3 className="text-xs font-bold text-slate-900 truncate">
                      {chat.contactName}
                    </h3>
                    <span className="text-[10px] text-slate-400 font-mono tabular-nums shrink-0">
                      {chat.timestamp}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 truncate leading-snug">
                    {chat.lastMessage}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Right Panel: Message Thread + Composer ── */}
      <div className="flex-1 flex flex-col min-w-0 bg-[#fafafa]">
        {/* Chat Header */}
        <div className="px-5 py-3 border-b border-gray-200/90 bg-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-slate-900 text-white flex items-center justify-center font-bold text-xs shadow-2xs">
              {(activeChat as any)?.isBot ? (
                <Bot className="w-4 h-4 text-blue-400" />
              ) : activeChat.isGroup ? (
                <Users className="w-4 h-4" />
              ) : (
                <Stethoscope className="w-4 h-4" />
              )}
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900" style={{ fontFamily: "Outfit, sans-serif" }}>
                {activeChat.contactName}
              </h3>
              <p className="text-xs text-slate-500 font-mono tabular-nums">
                {activeChat.phoneNumber}
              </p>
            </div>
          </div>
        </div>

        {/* Message Thread */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto p-6 space-y-3.5">
          {activeChat.messages.map((msg: Message) => {
            const isMe = msg.sender === "me";
            return (
              <div key={msg.id} className={`group flex flex-col ${isMe ? "items-end" : "items-start"}`}>
                {!isMe && msg.senderName && (
                  <span className="text-[10px] font-bold text-slate-500 mb-1 px-1">
                    {msg.senderName}
                  </span>
                )}

                <div className="flex items-center gap-2 max-w-[80%]">
                  {isMe && (
                    <Tooltip content="Reply">
                      <button
                        type="button"
                        onClick={() => setReplyingTo(msg)}
                        className="opacity-0 group-hover:opacity-100 p-1 text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 rounded transition-opacity cursor-pointer shrink-0"
                      >
                        <Reply className="w-3.5 h-3.5" />
                      </button>
                    </Tooltip>
                  )}

                  <div
                    className={`rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${isMe
                        ? "bg-[#1456f0] text-white rounded-br-xs shadow-xs"
                        : "bg-white text-slate-900 border border-gray-200/90 rounded-bl-xs shadow-2xs"
                      }`}
                  >
                    {/* Reply quote */}
                    {msg.replyTo && (
                      <div
                        className={`mb-2 p-2 rounded-lg text-xs border-l-2 ${isMe
                            ? "bg-white/15 border-white/80 text-white"
                            : "bg-slate-50 border-[#1456f0] text-slate-700"
                          }`}
                      >
                        <p className="font-bold text-[11px] mb-0.5">{msg.replyTo.senderName}</p>
                        <p className="line-clamp-2 opacity-90 text-[11px] italic">"{msg.replyTo.text}"</p>
                      </div>
                    )}

                    {/* Attachment preview */}
                    {msg.attachment && (
                      <div
                        className={`mb-2 p-2 rounded-xl flex items-center justify-between gap-3 border ${isMe ? "bg-white/15 border-white/30 text-white" : "bg-slate-50 border-gray-200 text-slate-900"
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
                          <button
                            type="button"
                            onClick={() => alert(`Downloading ${msg.attachment?.name}`)}
                            className={`p-1.5 rounded-lg transition-colors cursor-pointer shrink-0 ${isMe ? "hover:bg-white/20 text-white" : "hover:bg-slate-200 text-slate-600"
                              }`}
                          >
                            <Download className="w-3.5 h-3.5" />
                          </button>
                        </Tooltip>
                      </div>
                    )}

                    <p className="whitespace-pre-wrap">{msg.text}</p>

                    <div
                      className={`flex items-center justify-end gap-1 mt-1 text-[10px] font-mono tabular-nums ${isMe ? "text-blue-100/90" : "text-slate-400"
                        }`}
                    >
                      <span>{msg.timestamp}</span>
                      {isMe && <CheckCheck className="w-3.5 h-3.5 text-blue-200" />}
                    </div>
                  </div>

                  {!isMe && (
                    <Tooltip content="Reply">
                      <button
                        type="button"
                        onClick={() => setReplyingTo(msg)}
                        className="opacity-0 group-hover:opacity-100 p-1 text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 rounded transition-opacity cursor-pointer shrink-0"
                      >
                        <Reply className="w-3.5 h-3.5" />
                      </button>
                    </Tooltip>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Composer Bar */}
        <div className="p-4 border-t border-gray-200 bg-white shrink-0 space-y-2">
          {/* Reply Quote Strip */}
          {replyingTo && (
            <div className="flex items-center justify-between p-2 px-3 bg-slate-50 border border-slate-200/90 rounded-xl text-xs">
              <div className="flex items-center gap-2 min-w-0">
                <Reply className="w-3.5 h-3.5 text-[#1456f0] shrink-0" />
                <div className="min-w-0">
                  <span className="font-bold text-slate-800">
                    Replying to {replyingTo.senderName || activeChat.contactName}:
                  </span>{" "}
                  <span className="text-slate-500 truncate italic">"{replyingTo.text}"</span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setReplyingTo(null)}
                className="p-1 text-slate-400 hover:text-slate-700 rounded transition-colors cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* Attached File Strip */}
          {attachedFile && (
            <div className="flex items-center justify-between p-2 px-3 bg-blue-50/60 border border-blue-200/80 rounded-xl text-xs">
              <div className="flex items-center gap-2 min-w-0">
                <FileText className="w-3.5 h-3.5 text-[#1456f0] shrink-0" />
                <div className="min-w-0">
                  <span className="font-bold text-slate-900 truncate block">{attachedFile.name}</span>
                  <span className="text-[10px] text-slate-500 font-mono tabular-nums">{attachedFile.size}</span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setAttachedFile(null)}
                className="p-1 text-slate-400 hover:text-slate-700 rounded transition-colors cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          <div className="flex items-center gap-2">
            <Tooltip content="Attach File or Health Record">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
              >
                <Paperclip className="w-4 h-4" />
              </button>
            </Tooltip>

            <textarea
              rows={2}
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
              placeholder={`Message ${activeChat.contactName}...`}
              className="flex-1 text-xs p-2.5 bg-slate-50/60 hover:bg-white focus:bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#1456f0]/15 focus:border-[#1456f0] resize-none text-slate-900"
              style={{ fontFamily: "Outfit, sans-serif" }}
            />

            <button
              type="button"
              onClick={handleSend}
              disabled={!inputText.trim() && !attachedFile}
              className="w-10 h-10 bg-[#1456f0] hover:bg-blue-700 disabled:opacity-40 text-white rounded-xl shadow-xs transition-colors flex items-center justify-center cursor-pointer shrink-0"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}