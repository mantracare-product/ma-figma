import React, { useState, useMemo, useRef, useEffect } from "react";
import { useOutletContext, useSearchParams } from "react-router";
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
  ArrowLeft,
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
  const [searchParams, setSearchParams] = useSearchParams();

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
    const storedBot = conversations.find((c) => c.id === "care-bot-system" || c.isBot);
    const careBotChat: Conversation = storedBot || {
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

  // URL search param synchronization for mobile back-button navigation
  const activeChatIdParam = searchParams.get("chat");

  const [selectedChatId, setSelectedChatId] = useState<string>(() => {
    if (activeChatIdParam && clientConversations.some((c) => c.id === activeChatIdParam)) {
      return activeChatIdParam;
    }
    return clientConversations[0]?.id || "care-bot-system";
  });

  // Keep state in sync with URL
  useEffect(() => {
    if (activeChatIdParam && clientConversations.some((c) => c.id === activeChatIdParam)) {
      setSelectedChatId(activeChatIdParam);
    }
  }, [activeChatIdParam, clientConversations]);

  const [inputText, setInputText] = useState("");
  const [replyingTo, setReplyingTo] = useState<Message | null>(null);
  const [attachedFile, setAttachedFile] = useState<MessageAttachment | null>(null);
  const [isBotTyping, setIsBotTyping] = useState(false);
  const [isPlusMenuOpen, setIsPlusMenuOpen] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const plusMenuRef = useRef<HTMLDivElement>(null);
  const listScrollRef = useRef<HTMLDivElement>(null);

  const activeChat = clientConversations.find((c) => c.id === selectedChatId) || clientConversations[0];

  // Auto-scroll message stream
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [activeChat?.messages.length, isBotTyping, selectedChatId]);

  // Close plus menu on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (plusMenuRef.current && !plusMenuRef.current.contains(e.target as Node)) {
        setIsPlusMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSelectChat = (chatId: string) => {
    setSelectedChatId(chatId);
    setSearchParams({ chat: chatId }, { replace: false });
  };

  const handleBackToList = () => {
    setSearchParams({}, { replace: false });
  };

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

  const handleSend = (overrideText?: string, targetChatId?: string) => {
    const textToSend = overrideText !== undefined ? overrideText : inputText;
    if (!textToSend.trim() && !attachedFile) return;

    const destId = targetChatId || activeChat.id;
    const destChat = clientConversations.find((c) => c.id === destId) || activeChat;

    const replyRef: MessageReplyReference | undefined = replyingTo
      ? {
          id: replyingTo.id,
          text: replyingTo.text,
          senderName: replyingTo.senderName || (replyingTo.sender === "me" ? "Me" : destChat.contactName),
        }
      : undefined;

    const currentAttachedFile = attachedFile;
    const isBot = destId === "care-bot-system" || Boolean((destChat as any).isBot);

    // Clear input state immediately
    setInputText("");
    setAttachedFile(null);
    setReplyingTo(null);
    setIsPlusMenuOpen(false);

    // Dispatch message as patient
    sendMessage(destId, textToSend.trim(), {
      replyTo: replyRef,
      attachment: currentAttachedFile || undefined,
      sender: "me",
      senderName: activeClient.name,
    });

    // If Care Bot, trigger automated response
    if (isBot) {
      setIsBotTyping(true);
      setTimeout(() => {
        setIsBotTyping(false);
        const botReply = getBotKnowledgeResponse(textToSend);
        sendMessage(destId, botReply, {
          sender: "contact",
          senderName: "Care Bot",
        });
      }, 650);
    }
  };

  const handleOptionClick = (inquiry: string) => {
    if (selectedChatId !== "care-bot-system") {
      handleSelectChat("care-bot-system");
    }
    setInputText(inquiry);
    setTimeout(() => {
      handleSend(inquiry, "care-bot-system");
    }, 120);
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

  // Whether mobile view should currently display the full-screen chat rather than the list
  const showMobileChat = Boolean(activeChatIdParam);

  return (
    <div className="h-full w-full flex overflow-hidden bg-transparent select-none">
      {/* Hidden File Input */}
      <input type="file" ref={fileInputRef} onChange={handleFilePicked} className="hidden" />

      {/* ── Left Panel: Chat List (Desktop: generous padding, borderless rows; Mobile: full-screen list when no active chat param) ── */}
      <div
        ref={listScrollRef}
        className={`${
          showMobileChat ? "hidden md:flex" : "flex"
        } w-full md:w-72 lg:w-80 shrink-0 flex-col overflow-y-auto p-4 sm:p-6 lg:p-7 space-y-5 bg-transparent`}
      >
        <div className="px-2">
          <h2
            className="text-lg sm:text-xl font-bold text-slate-900 tracking-tight"
            style={{ fontFamily: "Outfit, sans-serif" }}
          >
            Messages
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Direct doctor chats, clinical groups &amp; AI assistant
          </p>
        </div>

        <div className="space-y-1.5 flex-1">
          {clientConversations.map((chat: any) => {
            const isSelected = chat.id === selectedChatId;
            const isGroup = Boolean(chat.isGroup);
            const isBot = Boolean(chat.isBot);

            return (
              <div
                key={chat.id}
                onClick={() => handleSelectChat(chat.id)}
                className={`p-3.5 rounded-2xl flex items-start gap-3 cursor-pointer transition-all ${
                  isSelected
                    ? "bg-white text-slate-900 shadow-sm border border-slate-200/60"
                    : "text-slate-700 hover:bg-slate-200/50 hover:text-slate-900"
                }`}
              >
                {/* Soft Rounded Avatar */}
                <div
                  className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-xs shrink-0 transition-colors ${
                    isSelected
                      ? "bg-slate-900 text-white"
                      : "bg-slate-200/80 text-slate-700"
                  }`}
                >
                  {isBot ? (
                    <Bot className="w-4 h-4 text-blue-500" />
                  ) : isGroup ? (
                    <Users className="w-4 h-4 text-slate-600" />
                  ) : (
                    <Stethoscope className="w-4 h-4 text-emerald-600" />
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
                  <p className="text-xs text-slate-500 truncate leading-snug">
                    {chat.lastMessage}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Central Conversation Stream & Floating Composer (Centered Column, Borderless) ── */}
      <div
        className={`${
          showMobileChat ? "flex" : "hidden md:flex"
        } flex-1 flex-col min-w-0 h-full overflow-hidden bg-transparent`}
      >
        {/* Chat Header: Plain text, no horizontal divider line */}
        <div className="px-4 sm:px-6 lg:px-8 pt-4 sm:pt-6 pb-2 shrink-0">
          <div className="max-w-[760px] mx-auto w-full flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              {/* Mobile Back Button to return to list */}
              <button
                type="button"
                onClick={handleBackToList}
                className="md:hidden -ml-1 p-2 rounded-xl text-slate-600 hover:text-slate-900 hover:bg-slate-200/60 transition-colors cursor-pointer shrink-0"
                aria-label="Back to messages list"
                title="Back to messages list"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>

              <div className="w-10 h-10 rounded-xl bg-slate-900 text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-xs">
                {(activeChat as any)?.isBot ? (
                  <Bot className="w-5 h-5 text-blue-400" />
                ) : activeChat.isGroup ? (
                  <Users className="w-5 h-5 text-slate-200" />
                ) : (
                  <Stethoscope className="w-5 h-5 text-emerald-400" />
                )}
              </div>

              <div className="min-w-0">
                <h3
                  className="text-sm sm:text-base font-bold text-slate-900 truncate"
                  style={{ fontFamily: "Outfit, sans-serif" }}
                >
                  {activeChat.contactName}
                </h3>
                <p className="text-xs text-slate-500 font-mono tabular-nums truncate">
                  {activeChat.phoneNumber}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <span className="inline-flex items-center gap-1.5 text-xs text-slate-500 font-medium">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                <span className="hidden sm:inline">Encrypted Channel</span>
              </span>
            </div>
          </div>
        </div>

        {/* Message Thread: Clean, centered column with comfortable 760px width */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 sm:px-6 lg:px-8 py-4 space-y-4">
          <div className="max-w-[760px] mx-auto w-full space-y-4">
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

                  <div className="flex items-center gap-2 max-w-[88%] sm:max-w-[80%]">
                    {isMe && (
                      <Tooltip content="Reply to message">
                        <button
                          type="button"
                          onClick={() => setReplyingTo(msg)}
                          className="opacity-0 group-hover:opacity-100 p-1.5 text-slate-400 hover:text-slate-800 hover:bg-slate-200/60 rounded-lg transition-opacity cursor-pointer shrink-0"
                        >
                          <Reply className="w-3.5 h-3.5" />
                        </button>
                      </Tooltip>
                    )}

                    {/* Message Bubble: Soft rounded corners and clean typography */}
                    <div
                      className={`rounded-2xl px-4 py-2.5 text-xs sm:text-sm leading-relaxed shadow-xs ${
                        isMe
                          ? "bg-[#1456f0] text-white border border-blue-600"
                          : "bg-white text-slate-900 border border-slate-200/80"
                      }`}
                    >
                      {/* Reply quote banner */}
                      {msg.replyTo && (
                        <div
                          className={`mb-2 p-2 rounded-xl text-xs border-l-2 ${
                            isMe
                              ? "bg-white/15 border-white/80 text-white"
                              : "bg-slate-50 border-[#1456f0] text-slate-700"
                          }`}
                        >
                          <p className="font-bold text-[11px] mb-0.5">{msg.replyTo.senderName}</p>
                          <p className="line-clamp-2 opacity-90 text-[11px] italic">"{msg.replyTo.text}"</p>
                        </div>
                      )}

                      {/* Attachment preview chip */}
                      {msg.attachment && (
                        <div
                          className={`mb-2 p-2 rounded-xl flex items-center justify-between gap-3 border ${
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
                              className={`p-1.5 rounded-lg transition-colors cursor-pointer shrink-0 ${
                                isMe ? "hover:bg-white/20 text-white" : "hover:bg-slate-200 text-slate-600"
                              }`}
                            >
                              <Download className="w-3.5 h-3.5" />
                            </button>
                          </Tooltip>
                        </div>
                      )}

                      <p className="whitespace-pre-wrap">{msg.text}</p>

                      {/* Care Bot Initial Quick Action Shortcuts */}
                      {isFirstWelcome && (
                        <div className="pt-3 pb-1 flex flex-col gap-1.5 w-full max-w-sm">
                          {CARE_BOT_SHORTCUTS.map((sc) => {
                            const Icon = sc.icon;
                            return (
                              <button
                                key={sc.id}
                                type="button"
                                onClick={() => handleOptionClick(sc.inquiry)}
                                className="w-full px-3 py-2 rounded-xl border border-gray-200 bg-white hover:bg-blue-50/70 hover:border-blue-300 text-slate-800 hover:text-blue-700 text-xs font-semibold transition-all flex items-center justify-between cursor-pointer shadow-2xs group text-left"
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
                          className="opacity-0 group-hover:opacity-100 p-1.5 text-slate-400 hover:text-slate-800 hover:bg-slate-200/60 rounded-lg transition-opacity cursor-pointer shrink-0"
                        >
                          <Reply className="w-3.5 h-3.5" />
                        </button>
                      </Tooltip>
                    )}
                  </div>
                </div>
              );
            })}

            {/* Care Bot Typing Animation */}
            {isBotTyping && (
              <div className="flex items-start gap-3 justify-start animate-in fade-in duration-150">
                <div className="w-8 h-8 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 shrink-0 mt-0.5 shadow-2xs">
                  <Bot className="w-4 h-4 text-blue-600" />
                </div>
                <div className="bg-white border border-gray-200 rounded-2xl px-4 py-3 shadow-2xs flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-bounce" style={{ animationDelay: "0ms" }} />
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-bounce" style={{ animationDelay: "150ms" }} />
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-bounce" style={{ animationDelay: "300ms" }} />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ── Floating Rounded Composer: Centered column, no top border ── */}
        <div className="px-4 sm:px-6 lg:px-8 pb-4 sm:pb-6 shrink-0 relative">
          <div className="max-w-[760px] mx-auto w-full space-y-2">
            {/* Floating Reply Quote Strip */}
            {replyingTo && (
              <div className="flex items-center justify-between p-2 px-3 bg-white/95 backdrop-blur-xs border border-slate-200/90 rounded-xl text-xs shadow-xs animate-in fade-in slide-in-from-bottom-2 duration-150">
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
                  className="p-1 text-slate-400 hover:text-slate-700 rounded-lg transition-colors cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            {/* Floating Attached File Strip */}
            {attachedFile && (
              <div className="flex items-center justify-between p-2 px-3 bg-blue-50/90 border border-blue-200/90 rounded-xl text-xs shadow-xs animate-in fade-in slide-in-from-bottom-2 duration-150">
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
                  className="p-1 text-slate-400 hover:text-slate-700 rounded-lg transition-colors cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            {/* Rounded Floating Input Bar with Shadow */}
            <div className="flex items-center gap-2 bg-white border border-slate-200/90 rounded-2xl p-1.5 pl-2.5 shadow-sm hover:shadow-md transition-shadow">
              {/* Plus Menu Trigger */}
              <div className="relative" ref={plusMenuRef}>
                <Tooltip content="Quick Care Actions">
                  <button
                    type="button"
                    onClick={() => setIsPlusMenuOpen((prev) => !prev)}
                    className="w-8 h-8 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-600 flex items-center justify-center transition-colors cursor-pointer"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </Tooltip>

                {isPlusMenuOpen && (
                  <div className="absolute bottom-full mb-2 left-0 w-64 bg-white border border-slate-200/90 rounded-2xl shadow-xl z-50 py-1.5 space-y-0.5 text-xs font-semibold animate-in fade-in zoom-in-95 duration-100">
                    <div className="px-3.5 py-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider border-b border-gray-100">
                      Quick Patient Inquiries
                    </div>
                    {CARE_BOT_SHORTCUTS.map((sc) => {
                      const Icon = sc.icon;
                      return (
                        <button
                          key={sc.id}
                          type="button"
                          onClick={() => handleOptionClick(sc.inquiry)}
                          className="w-full text-left px-3.5 py-2 flex items-center gap-2.5 hover:bg-slate-50 text-slate-800 transition-colors cursor-pointer"
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
                  className="w-8 h-8 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-600 flex items-center justify-center transition-colors cursor-pointer"
                >
                  <Paperclip className="w-4 h-4" />
                </button>
              </Tooltip>

              {/* Text Input */}
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
                className="flex-1 text-xs sm:text-sm p-1.5 px-2 bg-transparent focus:outline-none resize-none text-slate-900 leading-normal placeholder:text-slate-400"
                style={{ fontFamily: "DM Sans, sans-serif" }}
              />

              {/* Rounded Send Button */}
              <button
                type="button"
                onClick={() => handleSend()}
                disabled={!inputText.trim() && !attachedFile}
                className="w-9 h-9 bg-[#1E293B] hover:bg-slate-900 disabled:opacity-30 text-white rounded-xl shadow-xs transition-all flex items-center justify-center cursor-pointer shrink-0"
                aria-label="Send message"
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
