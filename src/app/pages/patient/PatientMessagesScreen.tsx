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
  Calendar,
  Receipt,
  ClipboardList,
  ChevronRight,
  Plus,
  ShieldCheck,
} from "lucide-react";
import {
  useConversations,
  Conversation,
  Message,
  MessageAttachment,
  MessageReplyReference,
} from "../../../lib/useConversations";
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

function formatTimestamp(ts?: string): string {
  if (!ts) return "";
  if (ts.includes("T") && (ts.endsWith("Z") || ts.includes("+") || ts.includes("-"))) {
    try {
      const d = new Date(ts);
      if (!isNaN(d.getTime())) {
        return d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit", hour12: true });
      }
    } catch {}
  }
  return ts;
}

const CARE_BOT_SHORTCUTS = [
  { id: "book", label: "Book an Appointment", icon: Calendar, inquiry: "I would like to book an appointment with my doctor." },
  { id: "bill", label: "Billing & Insurance", icon: Receipt, inquiry: "How can I review my bills and insurance coverage?" },
  { id: "intake", label: "Medical Intake & Questionnaires", icon: ClipboardList, inquiry: "Are there any health history forms or questionnaires I need to fill?" },
  { id: "doctor", label: "Connect with Responsible Care Team", icon: UserCheck, inquiry: "I would like to leave a message for my assigned clinician." },
  { id: "checkin", label: "Check in for Today's Visit", icon: Check, inquiry: "Please check me in for my appointment today." },
];

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
          text: "Hello Sarah! I am your MantraCare AI Health Assistant.\n\nHow can I help you today? Feel free to choose from the quick actions below, or ask any clinical or scheduling inquiry.",
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
  const [isBotTyping, setIsBotTyping] = useState(false);
  const [isPlusMenuOpen, setIsPlusMenuOpen] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const plusMenuRef = useRef<HTMLDivElement>(null);

  const activeChat = clientConversations.find((c) => c.id === selectedChatId) || clientConversations[0];

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [activeChat?.messages.length, isBotTyping]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (plusMenuRef.current && !plusMenuRef.current.contains(e.target as Node)) {
        setIsPlusMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const getBotKnowledgeResponse = (text: string): string => {
    const lower = text.toLowerCase().trim();
    const clinicianName = "Dr. Alistair Mehta";

    if (["hi", "hello", "hey", "good morning", "good afternoon"].some((g) => lower.includes(g))) {
      const name = activeClient.name.split(" ")[0] || "Sarah";
      return `Hi ${name}! How can I assist you with your health care today?\n\nFeel free to ask questions about your visits, prescription refills, test results, or billing.`;
    }

    if (lower.includes("book") || lower.includes("appointment") || lower.includes("slot") || lower.includes("schedule")) {
      return `Here is the scheduling information for **Appointments**:\n\n• Primary assigned clinician: **${clinicianName}**\n• Telehealth video calls & in-clinic consultations are available.\n• Real-time calendar availability is accessible anytime in your **Visits** tab.`;
    }

    if (lower.includes("bill") || lower.includes("pay") || lower.includes("invoice") || lower.includes("receipt") || lower.includes("cost") || lower.includes("insurance")) {
      return `Here are the details for **Billing & Payment**:\n\n• Review all itemized consultation bills and insurance adjustments in your **Billing** tab.\n• Online payment accepted via Credit/Debit Card, Apple Pay, and HSA/FSA.\n• Official receipts and superbills can be downloaded directly.`;
    }

    if (lower.includes("intake") || lower.includes("form") || lower.includes("questionnaire") || lower.includes("history")) {
      return `Here are the details for **Medical Intake & Questionnaires**:\n\n• Pre-visit clinical forms allow ${clinicianName} to review your medical history ahead of your visit.\n• All questionnaires are HIPAA-compliant, encrypted, and synced directly to your health record.\n• You can complete pending questionnaires in your **Forms** tab.`;
    }

    if (lower.includes("doctor") || lower.includes("message") || lower.includes("physician") || lower.includes("staff")) {
      return `Connected with your **Responsible Care Team**:\n\n• Your primary assigned clinician is **${clinicianName}**.\n• A direct message alert has been routed to the clinical team desk.\n• Staff will review your chart and follow up with you promptly.`;
    }

    if (lower.includes("checkin") || lower.includes("check in") || lower.includes("arrived")) {
      return `✅ **Check In Confirmed**:\n\n• You are checked in for today's visit.\n• Front desk reception and ${clinicianName} have been notified of your arrival.`;
    }

    return `I have noted your inquiry regarding "${text}".\n\nOur care team and ${clinicianName} have received this update. If this is an urgent matter, please reach out directly to the clinical front desk.`;
  };

  const handleSend = (overrideText?: string) => {
    const textToSend = overrideText || inputText;
    if (!textToSend.trim() && !attachedFile) return;

    const replyRef: MessageReplyReference | undefined = replyingTo
      ? {
          id: replyingTo.id,
          text: replyingTo.text,
          senderName: replyingTo.senderName || (replyingTo.sender === "me" ? "Me" : activeChat.contactName),
        }
      : undefined;

    // Dispatch message
    sendMessage(activeChat.id, textToSend.trim(), {
      replyTo: replyRef,
      attachment: attachedFile || undefined,
      sender: "me",
      senderName: activeClient.name,
    });

    if (!overrideText) {
      setInputText("");
      setAttachedFile(null);
      setReplyingTo(null);
    }
    setIsPlusMenuOpen(false);

    // If Care Bot, trigger automated response
    if (activeChat.isBot) {
      setIsBotTyping(true);
      setTimeout(() => {
        setIsBotTyping(false);
        const botReply = getBotKnowledgeResponse(textToSend);
        sendMessage(activeChat.id, botReply, {
          sender: "contact",
          senderName: "Care Bot",
        });
      }, 700);
    }
  };

  const handleFilePicked = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const sizeStr =
        file.size > 1024 * 1024
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
    <div className="h-full flex overflow-hidden bg-white border border-gray-200 rounded-none shadow-2xs">
      {/* Hidden File Input */}
      <input type="file" ref={fileInputRef} onChange={handleFilePicked} className="hidden" />

      {/* ── Left Sidebar: Kept exactly as is with sharp edges ── */}
      <div className="w-80 shrink-0 border-r border-gray-200 flex flex-col bg-slate-50/50">
        <div className="p-4 border-b border-gray-200 bg-white">
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
                className={`p-3.5 flex items-start gap-3 cursor-pointer transition-colors border-l-2 ${
                  isSelected ? "bg-blue-50/70 border-l-[#1456f0]" : "border-l-transparent bg-white hover:bg-slate-50"
                }`}
              >
                {/* Avatar with sharp edges */}
                <div
                  className={`w-9 h-9 rounded-sm flex items-center justify-center font-bold text-xs shrink-0 shadow-2xs ${
                    isSelected ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-700"
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
                      {formatTimestamp(chat.timestamp)}
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

      {/* ── Central UI: Revived centered conversational stream with sharp edges ── */}
      <div className="flex-1 flex flex-col min-w-0 bg-[#fafafa]">
        {/* Chat Header with Sharp Edges */}
        <div className="px-6 py-3.5 border-b border-gray-200 bg-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-sm bg-slate-900 text-white flex items-center justify-center font-bold text-xs shadow-2xs">
              {(activeChat as any)?.isBot ? (
                <Bot className="w-4 h-4 text-blue-400" />
              ) : activeChat.isGroup ? (
                <Users className="w-4 h-4 text-slate-200" />
              ) : (
                <Stethoscope className="w-4 h-4 text-emerald-400" />
              )}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-slate-900" style={{ fontFamily: "Outfit, sans-serif" }}>
                  {activeChat.contactName}
                </h3>
                {activeChat.isBot ? (
                  <span className="text-[10px] font-mono uppercase px-1.5 py-0.5 bg-blue-50 text-blue-700 border border-blue-200 rounded-sm">
                    AI Assistant
                  </span>
                ) : activeChat.isGroup ? (
                  <span className="text-[10px] font-mono uppercase px-1.5 py-0.5 bg-slate-100 text-slate-600 border border-slate-200 rounded-sm">
                    Group Chat
                  </span>
                ) : (
                  <span className="text-[10px] font-mono uppercase px-1.5 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-sm">
                    Primary Doctor
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 font-mono tabular-nums">
                {activeChat.phoneNumber}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 text-xs text-slate-500 font-medium">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              Encrypted Channel
            </span>
          </div>
        </div>

        {/* Message Thread (Centered Layout with Sharp Edges) */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto p-6 space-y-4">
          <div className="max-w-3xl mx-auto w-full space-y-4">
            {activeChat.messages.map((msg: Message, idx: number) => {
              const isMe = msg.sender === "me";
              const isFirstWelcome = !isMe && activeChat.isBot && idx === 0;

              return (
                <div key={msg.id} className={`group flex flex-col ${isMe ? "items-end" : "items-start"}`}>
                  {!isMe && msg.senderName && (
                    <span className="text-[11px] font-bold text-slate-600 mb-1 px-1 flex items-center gap-1">
                      {msg.senderName}
                    </span>
                  )}

                  <div className="flex items-center gap-2 max-w-[85%]">
                    {isMe && (
                      <Tooltip content="Reply to message">
                        <button
                          type="button"
                          onClick={() => setReplyingTo(msg)}
                          className="opacity-0 group-hover:opacity-100 p-1.5 text-slate-400 hover:text-slate-800 hover:bg-slate-200/60 rounded-sm transition-opacity cursor-pointer shrink-0"
                        >
                          <Reply className="w-3.5 h-3.5" />
                        </button>
                      </Tooltip>
                    )}

                    {/* Sharp Message Bubble */}
                    <div
                      className={`rounded-sm px-4 py-2.5 text-sm leading-relaxed ${
                        isMe
                          ? "bg-[#1456f0] text-white border border-blue-600 shadow-2xs"
                          : "bg-white text-slate-900 border border-gray-200 shadow-2xs"
                      }`}
                    >
                      {/* Reply quote banner with sharp edges */}
                      {msg.replyTo && (
                        <div
                          className={`mb-2 p-2 rounded-sm text-xs border-l-2 ${
                            isMe
                              ? "bg-white/15 border-white/80 text-white"
                              : "bg-slate-50 border-[#1456f0] text-slate-700"
                          }`}
                        >
                          <p className="font-bold text-[11px] mb-0.5">{msg.replyTo.senderName}</p>
                          <p className="line-clamp-2 opacity-90 text-[11px] italic">"{msg.replyTo.text}"</p>
                        </div>
                      )}

                      {/* Attachment preview chip with sharp edges */}
                      {msg.attachment && (
                        <div
                          className={`mb-2 p-2 rounded-sm flex items-center justify-between gap-3 border ${
                            isMe ? "bg-white/15 border-white/30 text-white" : "bg-slate-50 border-gray-200 text-slate-900"
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
                              className={`p-1.5 rounded-sm transition-colors cursor-pointer shrink-0 ${
                                isMe ? "hover:bg-white/20 text-white" : "hover:bg-slate-200 text-slate-600"
                              }`}
                            >
                              <Download className="w-3.5 h-3.5" />
                            </button>
                          </Tooltip>
                        </div>
                      )}

                      <p className="whitespace-pre-wrap">{msg.text}</p>

                      {/* Care Bot Initial Quick Action Shortcuts with Sharp Edges */}
                      {isFirstWelcome && (
                        <div className="pt-3 pb-1 flex flex-col gap-2 w-full max-w-sm">
                          {CARE_BOT_SHORTCUTS.map((sc) => {
                            const Icon = sc.icon;
                            return (
                              <button
                                key={sc.id}
                                type="button"
                                onClick={() => handleSend(sc.inquiry)}
                                className="w-full px-3 py-2 rounded-sm border border-gray-200 bg-white hover:bg-blue-50/70 hover:border-blue-300 text-slate-800 hover:text-blue-700 text-xs font-semibold transition-all flex items-center justify-between cursor-pointer shadow-2xs group text-left"
                              >
                                <div className="flex items-center gap-2">
                                  <Icon className="w-3.5 h-3.5 text-slate-400 group-hover:text-blue-600 shrink-0" />
                                  <span>{sc.label}</span>
                                </div>
                                <ChevronRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-blue-600 group-hover:translate-x-0.5 transition-all shrink-0" />
                              </button>
                            );
                          })}
                        </div>
                      )}

                      {/* Formatted Timestamp */}
                      <div
                        className={`flex items-center justify-end gap-1 mt-1 text-[10px] font-mono tabular-nums ${
                          isMe ? "text-blue-100/90" : "text-slate-400"
                        }`}
                      >
                        <span>{formatTimestamp(msg.timestamp)}</span>
                        {isMe && <CheckCheck className="w-3.5 h-3.5 text-blue-200" />}
                      </div>
                    </div>

                    {!isMe && (
                      <Tooltip content="Reply to message">
                        <button
                          type="button"
                          onClick={() => setReplyingTo(msg)}
                          className="opacity-0 group-hover:opacity-100 p-1.5 text-slate-400 hover:text-slate-800 hover:bg-slate-200/60 rounded-sm transition-opacity cursor-pointer shrink-0"
                        >
                          <Reply className="w-3.5 h-3.5" />
                        </button>
                      </Tooltip>
                    )}
                  </div>
                </div>
              );
            })}

            {/* Care Bot Typing Animation with Sharp Edges */}
            {isBotTyping && (
              <div className="flex items-start gap-3 justify-start animate-in fade-in duration-150">
                <div className="w-8 h-8 rounded-sm bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 shrink-0 mt-0.5 shadow-2xs">
                  <Bot className="w-4 h-4 text-blue-600" />
                </div>
                <div className="bg-white border border-gray-200 rounded-sm px-4 py-3 shadow-2xs flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-bounce" style={{ animationDelay: "0ms" }} />
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-bounce" style={{ animationDelay: "150ms" }} />
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-bounce" style={{ animationDelay: "300ms" }} />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ── Central Docked Composer with Sharp Edges ── */}
        <div className="p-4 border-t border-gray-200 bg-white shrink-0 relative">
          <div className="max-w-3xl mx-auto w-full space-y-2">
            {/* Reply Quote Strip with Sharp Edges */}
            {replyingTo && (
              <div className="flex items-center justify-between p-2 px-3 bg-slate-50 border border-slate-200 rounded-sm text-xs">
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
                  className="p-1 text-slate-400 hover:text-slate-700 rounded-sm transition-colors cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            {/* Attached File Strip with Sharp Edges */}
            {attachedFile && (
              <div className="flex items-center justify-between p-2 px-3 bg-blue-50/60 border border-blue-200 rounded-sm text-xs">
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
                  className="p-1 text-slate-400 hover:text-slate-700 rounded-sm transition-colors cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            {/* Input Bar Row */}
            <div className="flex items-center gap-2">
              {/* Plus Menu Trigger */}
              <div className="relative" ref={plusMenuRef}>
                <Tooltip content="Quick Care Actions">
                  <button
                    type="button"
                    onClick={() => setIsPlusMenuOpen((prev) => !prev)}
                    className="w-9 h-9 border border-gray-200 bg-white hover:bg-slate-50 text-slate-600 rounded-sm flex items-center justify-center transition-colors cursor-pointer"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </Tooltip>

                {isPlusMenuOpen && (
                  <div className="absolute bottom-11 left-0 w-64 bg-white border border-gray-200 rounded-sm shadow-lg z-50 py-1 space-y-0.5 text-xs font-semibold animate-in fade-in zoom-in-95 duration-100">
                    <div className="px-3 py-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider border-b border-gray-100">
                      Quick Patient Inquiries
                    </div>
                    {CARE_BOT_SHORTCUTS.map((sc) => {
                      const Icon = sc.icon;
                      return (
                        <button
                          key={sc.id}
                          type="button"
                          onClick={() => handleSend(sc.inquiry)}
                          className="w-full text-left px-3 py-2 flex items-center gap-2.5 hover:bg-slate-50 text-slate-800 transition-colors cursor-pointer"
                        >
                          <Icon className="w-3.5 h-3.5 text-slate-500" />
                          <span>{sc.label}</span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Attach File Button */}
              <Tooltip content="Attach File or Document">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="w-9 h-9 border border-gray-200 bg-white hover:bg-slate-50 text-slate-600 rounded-sm flex items-center justify-center transition-colors cursor-pointer"
                >
                  <Paperclip className="w-4 h-4" />
                </button>
              </Tooltip>

              {/* Text Input with Sharp Edges */}
              <textarea
                rows={1}
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleSend();
                  }
                }}
                placeholder={`Message ${activeChat.contactName}...`}
                className="flex-1 text-xs p-2.5 bg-slate-50 hover:bg-white focus:bg-white border border-gray-200 rounded-sm focus:outline-none focus:ring-1 focus:ring-[#1456f0] focus:border-[#1456f0] resize-none text-slate-900 leading-normal"
                style={{ fontFamily: "DM Sans, sans-serif" }}
              />

              {/* Sharp Send Button */}
              <button
                type="button"
                onClick={() => handleSend()}
                disabled={!inputText.trim() && !attachedFile}
                className="w-9 h-9 bg-[#1456f0] hover:bg-blue-700 disabled:opacity-40 text-white rounded-sm shadow-2xs transition-colors flex items-center justify-center cursor-pointer shrink-0"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
