import React, { useState, useEffect, useRef } from "react";
import { useOutletContext } from "react-router";
import {
  Send,
  Bot,
  Plus,
  Paperclip,
  ChevronRight,
  Calendar,
  Receipt,
  ClipboardList,
  UserCheck,
  PhoneCall,
  X,
} from "lucide-react";
import { Client, getStoredClients } from "../../../lib/clientsStore";
import {
  useConversations,
  Message,
  Conversation,
} from "../../../lib/useConversations";
import {
  getCompanionWidgetConfig,
  CompanionWidgetConfig,
  COMPANION_WIDGET_CONFIG_EVENT,
  CompanionRequirementItem,
} from "../../../lib/companionWidgetStore";
import { getStoredProcesses } from "../../../lib/useProcessStore";
import { toast } from "sonner";

interface OutletContextType {
  activeClient?: Client;
  onStageChange?: (newStageName: string) => void;
}

export default function PatientCareBotScreen() {
  const outletCtx = useOutletContext<OutletContextType>();

  // Fallback to activeClient from context or first stored client
  const activeClient =
    outletCtx?.activeClient ||
    getStoredClients()[0] || {
      id: "client-1",
      name: "Sarah Johnson",
      email: "sarah.j@example.com",
      phone: "+1 (555) 234-5678",
      responsible: "Dr. John Smith",
    };

  const { conversations, setConversations } = useConversations();
  const [config, setConfig] = useState<CompanionWidgetConfig>(getCompanionWidgetConfig);
  const [processes] = useState(() => getStoredProcesses());
  const [inputText, setInputText] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [attachments, setAttachments] = useState<File[]>([]);
  const [isPlusMenuOpen, setIsPlusMenuOpen] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const plusMenuRef = useRef<HTMLDivElement>(null);

  // Reload config on change
  useEffect(() => {
    const handleConfigChange = (e?: any) => {
      const latest = getCompanionWidgetConfig();
      if (e?.detail && typeof e.detail === "string") {
        latest.avatarUrl = e.detail;
      }
      setConfig(latest);
    };
    window.addEventListener(COMPANION_WIDGET_CONFIG_EVENT, handleConfigChange);
    window.addEventListener("storage", handleConfigChange);
    window.addEventListener("companion_avatar_updated", handleConfigChange);
    return () => {
      window.removeEventListener(COMPANION_WIDGET_CONFIG_EVENT, handleConfigChange);
      window.removeEventListener("storage", handleConfigChange);
      window.removeEventListener("companion_avatar_updated", handleConfigChange);
    };
  }, []);

  const botAvatar =
    config.avatarUrl ||
    (typeof window !== "undefined"
      ? localStorage.getItem("companion_bot_avatar") ||
        localStorage.getItem("active_bot_avatar") ||
        ""
      : "");

  // Close plus popup menu on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (plusMenuRef.current && !plusMenuRef.current.contains(e.target as Node)) {
        setIsPlusMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Find or create the Companion conversation for this client
  const clientConversation = conversations.find(
    (c) =>
      c.channel === "companion" &&
      (c.clientId === activeClient.id || c.contactName === activeClient.name)
  );

  // Initialize conversation if none exists
  useEffect(() => {
    if (!clientConversation) {
      const welcome = config.welcomeMessage
        ? config.welcomeMessage.replace("{{name}}", activeClient.name.split(" ")[0])
        : `Hi ${activeClient.name.split(" ")[0]}! Welcome to Care Bot. How can we help you today?`;

      const newConv: Conversation = {
        id: `conv-comp-${activeClient.id}`,
        clientId: activeClient.id,
        contactName: activeClient.name,
        phoneNumber: activeClient.phone || "+1 (555) 010-0100",
        inboxNumber: "Companion Portal",
        channel: "companion",
        lastMessage: welcome,
        timestamp: "Just now",
        unreadCount: 0,
        status: "open",
        botStatus: "active",
        messages: [
          {
            id: `msg-welcome-${Date.now()}`,
            text: welcome,
            timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
            sender: "me",
            origin: "bot",
            status: "read",
          },
        ],
      };

      setConversations((prev) => [newConv, ...prev]);
    }
  }, [clientConversation, activeClient, config, setConversations]);

  // Strip all action buttons and cleanup test routing messages from previous conversations
  useEffect(() => {
    if (clientConversation) {
      const hasBadMsgOrButtons = clientConversation.messages.some(
        (m) =>
          m.text.includes('I have routed your request to our "Client Intake"') ||
          m.text.includes("have routed your request to our") ||
          Boolean(m.buttons && m.buttons.length > 0)
      );

      if (hasBadMsgOrButtons) {
        const cleaned = clientConversation.messages
          .filter(
            (m) =>
              !m.text.includes('I have routed your request to our "Client Intake"') &&
              !m.text.includes("have routed your request to our")
          )
          .map((m) => {
            if (m.buttons) {
              const { buttons, ...rest } = m;
              return rest;
            }
            return m;
          });

        const updatedConv: Conversation = {
          ...clientConversation,
          messages: cleaned,
          lastMessage: cleaned[cleaned.length - 1]?.text || "",
        };
        setConversations((prev) =>
          prev.map((c) => (c.id === clientConversation.id ? updatedConv : c))
        );
      }
    }
  }, [clientConversation, setConversations]);

  const messages: Message[] = clientConversation?.messages || [];

  // Scroll to bottom on new message or typing state
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length, isTyping]);

  // Auto-grow textarea up to ~6 lines (max ~150px)
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 150)}px`;
    }
  }, [inputText]);

  const handleSelectRequirement = (req: CompanionRequirementItem) => {
    handleSend(req.label, req);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const newFiles = Array.from(e.target.files);
      setAttachments((prev) => [...prev, ...newFiles]);
      toast.success(`Attached ${newFiles.length} file${newFiles.length > 1 ? "s" : ""}`);
      setIsPlusMenuOpen(false);
    }
  };

  // Helper to formulate clean conversational knowledgebase responses (without action buttons)
  const getProcessKnowledgeResponse = (
    text: string,
    specificReq?: CompanionRequirementItem
  ) => {
    const lower = text.toLowerCase().trim();
    const reqLabel = (specificReq?.label || "").toLowerCase();

    const clinicianName =
      activeClient.responsible &&
      activeClient.responsible !== "Unassigned" &&
      activeClient.responsible.trim() !== ""
        ? activeClient.responsible
        : "Dr. John Smith";

    // 1. Casual greetings ("hi", "hello", "hey")
    if (["hi", "hello", "hey", "good morning", "good afternoon", "good evening"].includes(lower)) {
      const name = activeClient.name.split(" ")[0] || "there";
      return {
        text: `Hi ${name}! How can I assist you with your care today?\n\nFeel free to select one of the options above, click the **+** button for quick inquiries, or ask me any question.`,
      };
    }

    // 2. Booking / Appointment
    if (
      reqLabel.includes("book") ||
      reqLabel.includes("appointment") ||
      lower.includes("book") ||
      lower.includes("appointment") ||
      lower.includes("slot") ||
      lower.includes("schedule a visit")
    ) {
      return {
        text: `Here is the scheduling information for **Book an Appointment**:\n\n• Available care providers: ${clinicianName}, clinical nurse specialists, and telehealth doctors.\n• Appointments available for in-clinic consultation or secure video calls.\n• Real-time calendar availability with instant confirmation in your Visits tab.`,
      };
    }

    // 3. Billing & Payment
    if (
      reqLabel.includes("bill") ||
      reqLabel.includes("pay") ||
      lower.includes("bill") ||
      lower.includes("pay") ||
      lower.includes("invoice") ||
      lower.includes("cost") ||
      lower.includes("receipt")
    ) {
      return {
        text: `Here are the details for **Billing & Payment**:\n\n• Review all itemized consultation bills, lab charges, and insurance adjustments in your Billing tab.\n• Convenient online payment using credit/debit card, Apple Pay, or HSA/FSA accounts.\n• Download official tax receipts and superbills directly for your records.`,
      };
    }

    // 4. Intake / Medical History Questionnaires
    if (
      reqLabel.includes("intake") ||
      reqLabel.includes("questionnaire") ||
      reqLabel.includes("form") ||
      lower.includes("intake") ||
      lower.includes("form") ||
      lower.includes("questionnaire") ||
      lower.includes("medical history")
    ) {
      return {
        text: `Here are the details for **Medical Intake & Questionnaires**:\n\n• Pre-visit clinical forms allow your physician to review your history ahead of your visit.\n• All questionnaires are HIPAA-compliant, encrypted, and synced directly to your health record.\n• Takes only 3–5 minutes to complete online in your Forms tab.`,
      };
    }

    // 5. Connect with Responsible / Staff
    if (
      lower.includes("responsible") ||
      lower.includes("doctor") ||
      lower.includes("staff") ||
      lower.includes("nurse") ||
      lower.includes("provider") ||
      reqLabel.includes("consultation")
    ) {
      return {
        text: `Connected with your **Responsible Care Team**:\n\n• Your primary assigned clinician is **${clinicianName}**.\n• A direct message alert has been routed to the clinical team desk.\n• Staff will review your active chart and follow up with you promptly right here in chat.`,
      };
    }

    // 6. Check In
    if (lower.includes("checkin") || lower.includes("check in") || lower.includes("arrived")) {
      if (outletCtx?.onStageChange) outletCtx.onStageChange("Client Checked In");
      return {
        text: `✅ **Check In Confirmed**:\n\n• You are checked in for today's visit.\n• Front desk reception and your clinical provider have been notified of your arrival.\n• Please relax in the reception area or standby for your video appointment.`,
      };
    }

    // Default friendly assistant response
    return {
      text: `I have noted your inquiry regarding "${text}".\n\nOur care team and ${clinicianName} have received this update. If this requires immediate assistance, feel free to use the **+** menu to connect directly with your care team.`,
    };
  };

  const handleSend = (textToSend?: string, specificReq?: CompanionRequirementItem) => {
    const rawText = textToSend || inputText;
    if ((!rawText.trim() && attachments.length === 0) || !clientConversation) return;

    let text = rawText.trim();
    if (attachments.length > 0) {
      const attachInfo = attachments.map((f) => f.name).join(", ");
      text = text ? `${text}\n📎 Attached: ${attachInfo}` : `📎 Attached: ${attachInfo}`;
      setAttachments([]);
    }

    const convId = clientConversation.id;
    const nowTime = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

    const userMsg: Message = {
      id: `msg-p-${Date.now()}`,
      text,
      timestamp: nowTime,
      sender: "contact", // Patient sent
      status: "delivered",
    };

    const updatedMessages = [...clientConversation.messages, userMsg];

    const updatedConv: Conversation = {
      ...clientConversation,
      messages: updatedMessages,
      lastMessage: text,
      timestamp: nowTime,
      unreadCount: clientConversation.unreadCount + 1,
    };

    setConversations((prev) => prev.map((c) => (c.id === convId ? updatedConv : c)));
    if (!textToSend) setInputText("");

    // Auto-respond mapping to knowledgebase
    if (config.autoResponderEnabled && config.firstResponder === "ai") {
      setIsTyping(true);
      setTimeout(() => {
        setIsTyping(false);
        const kb = getProcessKnowledgeResponse(text, specificReq);

        const botMsg: Message = {
          id: `msg-bot-${Date.now()}`,
          text: kb.text,
          timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
          sender: "me",
          origin: "bot",
          status: "read",
        };

        const withBotReply = [...updatedMessages, botMsg];
        const convWithBot: Conversation = {
          ...updatedConv,
          messages: withBotReply,
          lastMessage: kb.text,
          timestamp: botMsg.timestamp,
        };

        setConversations((prev) => prev.map((c) => (c.id === convId ? convWithBot : c)));
      }, 500);
    }
  };

  const clinicianDisplayName =
    activeClient.responsible &&
    activeClient.responsible !== "Unassigned" &&
    activeClient.responsible.trim() !== ""
      ? activeClient.responsible
      : "Dr. John Smith";

  return (
    <div
      className="flex flex-col h-full w-full bg-[#F8FAFC] text-slate-900 overflow-hidden"
      style={{ fontFamily: "DM Sans, sans-serif" }}
    >
      {/* ── Chat Stream (Scrollable centered column) ── */}
      <div className="flex-1 flex flex-col min-h-0 relative">
        <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-6 space-y-6 max-w-[720px] mx-auto w-full">
          {messages.map((msg, idx) => {
            const isMe = msg.sender === "me"; // Me represents Bot in companion channel
            const isFirstWelcome = isMe && (msg.id.startsWith("msg-welcome") || idx === 0);

            return (
              <div
                key={msg.id}
                className={`animate-in fade-in duration-150 ${
                  isMe ? "flex items-start gap-3 justify-start" : "flex items-end justify-end"
                }`}
              >
                {isMe ? (
                  <>
                    <div className="w-8 h-8 rounded-full bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 shrink-0 mt-0.5 shadow-2xs overflow-hidden">
                      {botAvatar ? (
                        <img
                          src={botAvatar}
                          alt={config.botName || "Care Bot"}
                          className="w-full h-full object-cover rounded-full"
                        />
                      ) : (
                        <Bot className="w-4 h-4 text-blue-600" />
                      )}
                    </div>
                    <div className="space-y-3 flex-1 min-w-0">
                      {/* Message Text */}
                      <div
                        className="text-[14px] sm:text-[15px] leading-[1.6] text-slate-900 whitespace-pre-line font-normal"
                        style={{ fontFamily: "DM Sans, sans-serif" }}
                      >
                        {msg.text}
                      </div>

                      {/* Initial Greeting: Requirements stacked vertically one after another! */}
                      {isFirstWelcome && (
                        <div className="pt-2 flex flex-col gap-2 w-full max-w-sm">
                          {(config.requirements || []).map((req) => (
                            <button
                              key={req.id}
                              type="button"
                              onClick={() => handleSelectRequirement(req)}
                              className="w-full px-3.5 py-2.5 rounded-2xl border border-slate-200/90 bg-white hover:bg-blue-50/80 hover:border-blue-300 text-slate-800 hover:text-blue-700 text-xs font-semibold transition-all flex items-center justify-between cursor-pointer shadow-2xs group text-left"
                              style={{ fontFamily: "Outfit, sans-serif" }}
                            >
                              <span>{req.label}</span>
                              <ChevronRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-blue-600 group-hover:translate-x-0.5 transition-all shrink-0" />
                            </button>
                          ))}
                        </div>
                      )}

                      <div className="text-[11px] text-slate-400">
                        {msg.timestamp}
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="max-w-[80%] sm:max-w-[70%] bg-blue-600 text-white rounded-2xl rounded-br-xs px-4 py-3 shadow-2xs space-y-1">
                    <p
                      className="text-[14px] sm:text-[15px] leading-[1.6] whitespace-pre-line font-normal"
                      style={{ fontFamily: "DM Sans, sans-serif" }}
                    >
                      {msg.text}
                    </p>
                    <div className="text-right text-[10px] text-blue-200">
                      {msg.timestamp}
                    </div>
                  </div>
                )}
              </div>
            );
          })}

          {/* Typing Indicator */}
          {isTyping && (
            <div className="flex items-start gap-3 justify-start animate-in fade-in duration-150">
              <div className="w-8 h-8 rounded-full bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 shrink-0 mt-0.5 shadow-2xs overflow-hidden">
                {botAvatar ? (
                  <img
                    src={botAvatar}
                    alt={config.botName || "Care Bot"}
                    className="w-full h-full object-cover rounded-full"
                  />
                ) : (
                  <Bot className="w-4 h-4 text-blue-600" />
                )}
              </div>
              <div className="flex items-center gap-1.5 py-2 px-1">
                <span className="w-2 h-2 rounded-full bg-blue-400 animate-bounce" style={{ animationDelay: "0ms" }} />
                <span className="w-2 h-2 rounded-full bg-blue-400 animate-bounce" style={{ animationDelay: "150ms" }} />
                <span className="w-2 h-2 rounded-full bg-blue-400 animate-bounce" style={{ animationDelay: "300ms" }} />
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* ── Pinned Bottom Composer ── */}
        <div className="sticky bottom-0 w-full max-w-[720px] mx-auto px-4 sm:px-6 pb-4 pt-2 bg-gradient-to-t from-[#F8FAFC] via-[#F8FAFC]/95 to-transparent z-10 shrink-0">
          <div className="space-y-2">
            <div className="bg-white border border-slate-200/90 rounded-2xl sm:rounded-3xl p-3 sm:p-3.5 shadow-sm shadow-slate-200/50 focus-within:ring-2 focus-within:ring-blue-500/20 focus-within:border-blue-500 transition-all duration-200">
              {/* Auto-growing Textarea */}
              <textarea
                ref={textareaRef}
                rows={1}
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Reply to Care Bot..."
                className="w-full bg-transparent text-[14px] sm:text-[15px] leading-[1.6] text-slate-900 placeholder:text-slate-400 border-none outline-none resize-none max-h-36 px-1.5 py-0.5"
                style={{ fontFamily: "DM Sans, sans-serif" }}
                aria-label="Message Care Bot"
              />

              {/* Attached files preview */}
              {attachments.length > 0 && (
                <div className="flex flex-wrap gap-1.5 px-1 py-1 mb-1">
                  {attachments.map((file, idx) => (
                    <span
                      key={idx}
                      className="inline-flex items-center gap-1.5 text-xs bg-slate-100 text-slate-700 px-2.5 py-1 rounded-lg border border-slate-200"
                    >
                      <Paperclip className="w-3 h-3 text-slate-400" />
                      <span className="truncate max-w-[150px]">{file.name}</span>
                      <button
                        type="button"
                        onClick={() => setAttachments((prev) => prev.filter((_, i) => i !== idx))}
                        className="hover:text-red-500 text-slate-400 ml-0.5 cursor-pointer"
                        aria-label="Remove attachment"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                </div>
              )}

              {/* Bottom row inside container */}
              <div className="flex items-center justify-between pt-2.5 mt-1 border-t border-slate-100 gap-2">
                {/* Left action group: Claude-style '+' Menu ONLY */}
                <div className="flex items-center gap-2 min-w-0">
                  {/* Hidden file input */}
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileChange}
                    className="hidden"
                    multiple
                  />

                  {/* '+' Menu Trigger & Popup */}
                  <div className="relative" ref={plusMenuRef}>
                    <button
                      type="button"
                      onClick={() => setIsPlusMenuOpen(!isPlusMenuOpen)}
                      className={`w-7 h-7 rounded-xl flex items-center justify-center transition-all cursor-pointer ${
                        isPlusMenuOpen
                          ? "bg-slate-900 text-white shadow-2xs"
                          : "bg-slate-100 hover:bg-slate-200 text-slate-600 hover:text-slate-900"
                      }`}
                      title="Quick actions & attachments"
                      aria-label="Quick actions & attachments"
                    >
                      <Plus className={`w-4 h-4 transition-transform duration-150 ${isPlusMenuOpen ? "rotate-45" : ""}`} />
                    </button>

                    {/* Claude-style Popup Menu */}
                    {isPlusMenuOpen && (
                      <div className="absolute bottom-full left-0 mb-2 w-72 bg-white/95 backdrop-blur-md border border-slate-200/90 rounded-2xl shadow-xl p-1.5 z-50 animate-in fade-in zoom-in-95 duration-150 space-y-0.5">
                        {/* 1. Upload or add files */}
                        <button
                          type="button"
                          onClick={() => fileInputRef.current?.click()}
                          className="w-full px-3 py-2 text-xs font-semibold text-slate-700 hover:text-slate-950 hover:bg-slate-50 flex items-center gap-2.5 rounded-xl transition-colors cursor-pointer text-left"
                        >
                          <Paperclip className="w-4 h-4 text-slate-500" />
                          <span>Upload or add files</span>
                        </button>

                        <div className="h-px bg-slate-100 my-1" />

                        {/* Quick Process Queries */}
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-3 py-1">
                          Quick Inquiries
                        </p>

                        <button
                          type="button"
                          onClick={() => {
                            setIsPlusMenuOpen(false);
                            handleSend("How to book an appointment");
                          }}
                          className="w-full px-3 py-2 text-xs font-semibold text-slate-700 hover:text-blue-700 hover:bg-blue-50/60 flex items-center gap-2.5 rounded-xl transition-colors cursor-pointer text-left"
                        >
                          <Calendar className="w-4 h-4 text-blue-600 shrink-0" />
                          <span className="truncate">How to book an appointment</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            setIsPlusMenuOpen(false);
                            handleSend("Billing and payment inquiry");
                          }}
                          className="w-full px-3 py-2 text-xs font-semibold text-slate-700 hover:text-emerald-700 hover:bg-emerald-50/60 flex items-center gap-2.5 rounded-xl transition-colors cursor-pointer text-left"
                        >
                          <Receipt className="w-4 h-4 text-emerald-600 shrink-0" />
                          <span className="truncate">Billing and payment inquiry</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            setIsPlusMenuOpen(false);
                            handleSend("Medical intake & questionnaires");
                          }}
                          className="w-full px-3 py-2 text-xs font-semibold text-slate-700 hover:text-purple-700 hover:bg-purple-50/60 flex items-center gap-2.5 rounded-xl transition-colors cursor-pointer text-left"
                        >
                          <ClipboardList className="w-4 h-4 text-purple-600 shrink-0" />
                          <span className="truncate">Medical intake & questionnaires</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            setIsPlusMenuOpen(false);
                            handleSend("Check in for today's visit");
                          }}
                          className="w-full px-3 py-2 text-xs font-semibold text-slate-700 hover:text-blue-700 hover:bg-blue-50/60 flex items-center gap-2.5 rounded-xl transition-colors cursor-pointer text-left"
                        >
                          <UserCheck className="w-4 h-4 text-blue-600 shrink-0" />
                          <span className="truncate">Check in for today's visit</span>
                        </button>

                        <div className="h-px bg-slate-100 my-1" />

                        {/* Connect with Responsible */}
                        <button
                          type="button"
                          onClick={() => {
                            setIsPlusMenuOpen(false);
                            handleSend(`Connect with responsible provider, ${clinicianDisplayName}`);
                          }}
                          className="w-full px-3 py-2 text-xs font-bold text-amber-700 hover:bg-amber-50/70 flex items-center gap-2.5 rounded-xl transition-colors cursor-pointer text-left"
                        >
                          <PhoneCall className="w-4 h-4 text-amber-600 shrink-0" />
                          <span className="truncate">
                            Connect with {clinicianDisplayName}
                          </span>
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {/* Right action group: Enter hint and Blue Send Button */}
                <div className="flex items-center gap-2.5 shrink-0">
                  <span className="text-[11px] text-slate-400 hidden sm:inline">
                    Press Enter ↵
                  </span>

                  <button
                    type="button"
                    onClick={() => handleSend()}
                    disabled={!inputText.trim() && attachments.length === 0}
                    className="w-8 h-8 rounded-full flex items-center justify-center text-white bg-blue-600 hover:bg-blue-700 transition-all duration-150 shadow-2xs hover:scale-105 active:scale-95 disabled:bg-slate-200 disabled:text-slate-400 disabled:hover:scale-100 disabled:pointer-events-none cursor-pointer shrink-0"
                    title="Send message"
                    aria-label="Send message"
                  >
                    <Send className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>

            {/* Footer text below composer */}
            <div className="text-center text-[11px] text-slate-400 space-x-1">
              <span>Powered by MantraAssist Care Engine</span>
              <span>•</span>
              <span>Auto-mapped to clinic workflow</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
