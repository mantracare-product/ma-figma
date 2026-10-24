import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router";
import {
  X,
  Send,
  Bot,
  Sparkles,
  ShieldCheck,
  ChevronRight,
} from "lucide-react";
import { Client } from "../../../../lib/clientsStore";
import {
  useConversations,
  Message,
  Conversation,
} from "../../../../lib/useConversations";
import {
  getCompanionWidgetConfig,
  CompanionWidgetConfig,
  COMPANION_WIDGET_CONFIG_EVENT,
  CompanionRequirementItem,
} from "../../../../lib/companionWidgetStore";
import { getStoredProcesses } from "../../../../lib/useProcessStore";

interface CareBotDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  activeClient: Client;
  onCheckIn?: () => void;
}

export default function CareBotDrawer({
  isOpen,
  onClose,
  activeClient,
  onCheckIn,
}: CareBotDrawerProps) {
  const navigate = useNavigate();
  const { conversations, setConversations } = useConversations();
  const [config, setConfig] = useState<CompanionWidgetConfig>(getCompanionWidgetConfig);
  const [processes] = useState(() => getStoredProcesses());
  const [selectedReqId, setSelectedReqId] = useState<string>("");
  const [inputText, setInputText] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Reload config on change
  useEffect(() => {
    const handleConfigChange = () => {
      const cfg = getCompanionWidgetConfig();
      setConfig(cfg);
      if (cfg.requirements?.length > 0 && !selectedReqId) {
        setSelectedReqId(cfg.requirements[0].id);
      }
    };
    window.addEventListener(COMPANION_WIDGET_CONFIG_EVENT, handleConfigChange);
    return () => window.removeEventListener(COMPANION_WIDGET_CONFIG_EVENT, handleConfigChange);
  }, [selectedReqId]);

  useEffect(() => {
    if (config.requirements?.length > 0 && !selectedReqId) {
      setSelectedReqId(config.requirements[0].id);
    }
  }, [config.requirements, selectedReqId]);

  // Find or create the Companion conversation for this client
  const clientConversation = conversations.find(
    (c) => c.channel === "companion" && (c.clientId === activeClient.id || c.contactName === activeClient.name)
  );

  // Initialize conversation if none exists
  useEffect(() => {
    if (!clientConversation && isOpen) {
      const welcome = config.welcomeMessage
        ? config.welcomeMessage.replace("{{name}}", activeClient.name.split(" ")[0])
        : `Hi ${activeClient.name.split(" ")[0]}! How can we help you today?`;

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
  }, [clientConversation, isOpen, activeClient, config, setConversations]);

  const messages: Message[] = clientConversation?.messages || [];

  // Scroll to bottom on new message
  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages.length, isOpen]);

  if (!isOpen) return null;

  const handleSelectRequirement = (req: CompanionRequirementItem) => {
    setSelectedReqId(req.id);
    handleSend(req.label, req);
  };

  const handleSend = (textToSend?: string, specificReq?: CompanionRequirementItem) => {
    const text = textToSend || inputText;
    if (!text.trim() || !clientConversation) return;

    const convId = clientConversation.id;
    const nowTime = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    const currentReq = specificReq || config.requirements.find((r) => r.id === selectedReqId) || config.requirements[0];
    const targetProcess = processes.find((p) => p.id === currentReq?.processId);

    const userMsg: Message = {
      id: `msg-p-${Date.now()}`,
      text: text.trim(),
      timestamp: nowTime,
      sender: "contact", // Patient sent
      status: "delivered",
    };

    const updatedMessages = [...clientConversation.messages, userMsg];

    const updatedConv: Conversation = {
      ...clientConversation,
      messages: updatedMessages,
      lastMessage: text.trim(),
      timestamp: nowTime,
      unreadCount: clientConversation.unreadCount + 1,
    };

    setConversations((prev) => prev.map((c) => (c.id === convId ? updatedConv : c)));
    if (!textToSend) setInputText("");

    // Auto-respond mapping to selected requirement & target process
    if (config.autoResponderEnabled && config.firstResponder === "ai") {
      setTimeout(() => {
        const lower = text.toLowerCase();
        let botReplyText = "";
        let actionRoute = "";
        let actionLabel = "";

        if (lower.includes("book") || currentReq?.label.toLowerCase().includes("book")) {
          botReplyText = `I have routed your request to our "${targetProcess?.name || "Book Appointment"}" process. You can choose your doctor and slot below:`;
          actionRoute = "/patient/book";
          actionLabel = "Open Booking Slots";
        } else if (lower.includes("bill") || lower.includes("pay") || lower.includes("invoice") || currentReq?.label.toLowerCase().includes("bill")) {
          botReplyText = `Your inquiry is mapped to "${targetProcess?.name || "Billing & Payment"}". You can review your statement and pay online below:`;
          actionRoute = "/patient/bill";
          actionLabel = "View & Pay Invoices";
        } else if (lower.includes("form") || lower.includes("intake") || currentReq?.label.toLowerCase().includes("intake") || currentReq?.label.toLowerCase().includes("form")) {
          botReplyText = `Mapped to "${targetProcess?.name || "Intake Assessment"}". Please complete your questionnaires before your upcoming visit:`;
          actionRoute = "/patient/forms";
          actionLabel = "Complete Forms";
        } else if (lower.includes("checkin") || lower.includes("check in") || lower.includes("arrived")) {
          botReplyText = "You are checked in for today's visit! The clinical care team has received your arrival notice.";
          actionRoute = "/patient/book";
          actionLabel = "View Visit Status";
          if (onCheckIn) onCheckIn();
        } else {
          botReplyText = `I've mapped your inquiry under "${targetProcess?.name || "Patient Care"}". Our team has been notified and will assist you shortly.`;
        }

        const botMsg: Message = {
          id: `msg-bot-${Date.now()}`,
          text: botReplyText,
          timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
          sender: "me",
          origin: "bot",
          status: "read",
          buttons: actionRoute && actionLabel ? [{ label: actionLabel, actionValue: actionRoute }] : undefined,
        };

        const withBotReply = [...updatedMessages, botMsg];
        const convWithBot: Conversation = {
          ...updatedConv,
          messages: withBotReply,
          lastMessage: botReplyText,
          timestamp: botMsg.timestamp,
        };

        setConversations((prev) => prev.map((c) => (c.id === convId ? convWithBot : c)));
      }, 450);
    }
  };

  const themeColor = config.themeColor || "#2563EB";

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs transition-opacity animate-in fade-in duration-200"
        onClick={onClose}
      />

      {/* Drawer Container */}
      <div className="relative w-full max-w-md sm:max-w-lg bg-white h-full shadow-2xl flex flex-col z-10 animate-in slide-in-from-right duration-250 ease-out select-none">
        {/* Drawer Header */}
        <div
          className="p-4 text-white flex items-center justify-between shadow-xs shrink-0 transition-colors"
          style={{ backgroundColor: themeColor }}
        >
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-white/20 backdrop-blur-xs flex items-center justify-center font-bold text-white shadow-2xs">
              <Bot className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-white" style={{ fontFamily: "Outfit, sans-serif" }}>
                  {config.botName || "Care Bot"}
                </span>
                <span className="flex items-center gap-1 text-[10px] font-semibold bg-emerald-500/80 text-white px-1.5 py-0.2 rounded-full">
                  <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                  Online
                </span>
              </div>
              <span className="text-xs text-white/80 block mt-0.5">
                MantraCare Companion • 24/7 Clinical Assistant
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl text-white/80 hover:text-white hover:bg-white/20 transition-colors cursor-pointer"
            aria-label="Close Care Bot"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Patient Status Strip */}
        <div className="px-4 py-2 bg-slate-50 border-b border-slate-100 flex items-center justify-between text-xs text-slate-600 shrink-0">
          <div className="flex items-center gap-1.5 truncate">
            <ShieldCheck className="w-3.5 h-3.5 text-blue-600 shrink-0" />
            <span className="truncate">
              Assisting <b>{activeClient.name}</b>
            </span>
            <span className="text-[10px] font-mono text-slate-400">#{activeClient.id}</span>
          </div>
          <span className="text-[10px] font-mono uppercase tracking-wider text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded font-bold border border-emerald-200/60 shrink-0">
            Authenticated
          </span>
        </div>

        {/* Messages Scroll Area */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3.5 bg-[#F8FAFC]">
          {messages.length === 0 ? (
            <div className="p-8 text-center text-slate-400 text-xs">
              Connecting with Care Bot...
            </div>
          ) : (
            messages.map((msg) => {
              const isPatient = msg.sender === "contact";
              return (
                <div
                  key={msg.id}
                  className={`flex flex-col ${isPatient ? "items-end" : "items-start"}`}
                >
                  <div
                    className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-xs shadow-2xs leading-relaxed ${
                      isPatient
                        ? "bg-slate-900 text-white rounded-tr-xs"
                        : "bg-white text-slate-800 border border-slate-200/90 rounded-tl-xs"
                    }`}
                  >
                    <p className="whitespace-pre-wrap">{msg.text}</p>
                  </div>

                  {/* Optional Action Card button on bot message */}
                  {msg.buttons && msg.buttons.length > 0 && (
                    <div className="mt-2 w-full max-w-[85%]">
                      {msg.buttons.map((btn, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => {
                            if (btn.actionValue) {
                              onClose();
                              navigate(btn.actionValue);
                            }
                          }}
                          className="w-full p-2.5 rounded-xl bg-white hover:bg-slate-50 border border-blue-200/80 shadow-2xs flex items-center justify-between gap-2 text-xs font-bold text-slate-800 transition-all cursor-pointer group"
                          style={{ fontFamily: "Outfit, sans-serif" }}
                        >
                          <div className="flex items-center gap-2">
                            <Sparkles className="w-3.5 h-3.5 text-blue-600" />
                            <span>{btn.label}</span>
                          </div>
                          <span
                            className="px-2.5 py-1 rounded-lg text-[10px] font-bold text-white shadow-2xs group-hover:scale-105 transition-transform"
                            style={{ backgroundColor: themeColor }}
                          >
                            Open &rarr;
                          </span>
                        </button>
                      ))}
                    </div>
                  )}

                  <span className="text-[10px] text-slate-400 mt-1 px-1 font-mono">
                    {msg.timestamp}
                  </span>
                </div>
              );
            })
          )}

          {/* Requirement Options (Pre-Chat Requirement selector like website widget) */}
          {config.requirements && config.requirements.length > 0 && (
            <div className="pt-2 space-y-1.5">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block px-1">
                Select Your Requirement
              </span>
              <div className="flex flex-wrap gap-1.5">
                {config.requirements.map((req) => (
                  <button
                    key={req.id}
                    type="button"
                    onClick={() => handleSelectRequirement(req)}
                    className="px-3 py-1.5 rounded-xl bg-white hover:bg-slate-100/90 border border-slate-200 text-xs font-semibold text-slate-700 transition-all shadow-2xs hover:shadow-xs cursor-pointer active:scale-95 text-left flex items-center gap-1.5"
                    style={{ fontFamily: "Outfit, sans-serif" }}
                  >
                    <span>{req.label}</span>
                    <ChevronRight className="w-3 h-3 text-slate-400" />
                  </button>
                ))}
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Composer Bar with Requirement Mapping Selector */}
        <div className="p-3 bg-white border-t border-slate-200 shrink-0 space-y-2">
          {config.requirements && config.requirements.length > 0 && (
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 shrink-0">
                Requirement:
              </span>
              <select
                value={selectedReqId}
                onChange={(e) => setSelectedReqId(e.target.value)}
                className="flex-1 text-xs font-semibold px-2 py-1 rounded-lg bg-slate-50 border border-slate-200 text-slate-700 outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer"
                style={{ fontFamily: "Outfit, sans-serif" }}
              >
                {config.requirements.map((req) => {
                  const proc = processes.find((p) => p.id === req.processId);
                  return (
                    <option key={req.id} value={req.id}>
                      {req.label} {proc ? `(${proc.name})` : ""}
                    </option>
                  );
                })}
              </select>
            </div>
          )}

          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSend();
            }}
            className="flex items-center gap-2"
          >
            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="Type your message or inquiry..."
              className="flex-1 text-xs px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/30 text-slate-800 transition-all"
            />
            <button
              type="submit"
              disabled={!inputText.trim()}
              className="w-9 h-9 rounded-xl text-white flex items-center justify-center shrink-0 shadow-2xs hover:opacity-95 disabled:opacity-40 transition-all cursor-pointer disabled:cursor-not-allowed"
              style={{ backgroundColor: themeColor }}
              title="Send message"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
          <div className="flex items-center justify-between text-[10px] text-slate-400 px-1">
            <span>Powered by MantraAssist Care Engine</span>
            <span>Auto-mapped to clinic workflow</span>
          </div>
        </div>
      </div>
    </div>
  );
}
