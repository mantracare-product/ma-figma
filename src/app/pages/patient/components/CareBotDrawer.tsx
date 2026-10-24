import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router";
import {
  X,
  Send,
  Bot,
  Sparkles,
  Calendar,
  Receipt,
  ClipboardList,
  CheckCircle2,
  ShieldCheck,
  ArrowRight,
  RefreshCw,
  Clock,
  Check,
  CheckCheck,
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
} from "../../../../lib/companionWidgetStore";

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
  const { conversations, setConversations, sendMessage } = useConversations();
  const [config, setConfig] = useState<CompanionWidgetConfig>(getCompanionWidgetConfig);
  const [inputText, setInputText] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Reload config on change
  useEffect(() => {
    const handleConfigChange = () => setConfig(getCompanionWidgetConfig());
    window.addEventListener(COMPANION_WIDGET_CONFIG_EVENT, handleConfigChange);
    return () => window.removeEventListener(COMPANION_WIDGET_CONFIG_EVENT, handleConfigChange);
  }, []);

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

  const handleSend = (textToSend?: string) => {
    const text = textToSend || inputText;
    if (!text.trim() || !clientConversation) return;

    const convId = clientConversation.id;
    const nowTime = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

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

    // Smart Intent Auto-reply matching config
    if (config.autoResponderEnabled && config.firstResponder === "ai") {
      setTimeout(() => {
        const lower = text.toLowerCase();
        let matchedIntent = config.intents.find(
          (i) => i.enabled && lower.includes(i.label.toLowerCase().replace(/^[^\w\s]+/, "").trim())
        );

        if (!matchedIntent) {
          if (lower.includes("book") || lower.includes("appointment") || lower.includes("slot") || lower.includes("visit")) {
            matchedIntent = config.intents.find((i) => i.intent === "book");
          } else if (lower.includes("bill") || lower.includes("invoice") || lower.includes("pay") || lower.includes("cost")) {
            matchedIntent = config.intents.find((i) => i.intent === "bills");
          } else if (lower.includes("form") || lower.includes("intake") || lower.includes("questionnaire")) {
            matchedIntent = config.intents.find((i) => i.intent === "forms");
          } else if (lower.includes("checkin") || lower.includes("check in") || lower.includes("arrived")) {
            matchedIntent = config.intents.find((i) => i.intent === "checkin");
          }
        }

        let botReplyText = "";
        let actionRoute = "";
        let actionLabel = "";

        if (matchedIntent) {
          botReplyText = matchedIntent.botReply;
          actionRoute = matchedIntent.actionRoute || "";
          actionLabel = matchedIntent.actionLabel || "";

          if (matchedIntent.intent === "checkin" && onCheckIn) {
            onCheckIn();
          }
        } else {
          botReplyText = `Thank you, ${activeClient.name.split(" ")[0]}. I've shared this with your clinic care team and practitioner. They will respond here in Companion shortly.`;
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
      }, 500);
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

          {/* Quick Intent Chips (shown when config allows) */}
          {config.showIntentChips && (
            <div className="pt-2 space-y-1.5">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block px-1">
                How can we help today?
              </span>
              <div className="flex flex-wrap gap-1.5">
                {config.intents
                  .filter((i) => i.enabled)
                  .map((intent) => (
                    <button
                      key={intent.id}
                      type="button"
                      onClick={() => handleSend(intent.label)}
                      className="px-3 py-1.5 rounded-xl bg-white hover:bg-slate-100/90 border border-slate-200 text-xs font-semibold text-slate-700 transition-all shadow-2xs hover:shadow-xs cursor-pointer active:scale-95 text-left flex items-center gap-1.5"
                      style={{ fontFamily: "Outfit, sans-serif" }}
                    >
                      <span>{intent.label}</span>
                    </button>
                  ))}
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Composer Bar */}
        <div className="p-3 bg-white border-t border-slate-200 shrink-0">
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
              placeholder="Ask Care Bot a question..."
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
          <div className="flex items-center justify-between text-[10px] text-slate-400 mt-2 px-1">
            <span>Powered by MantraAssist Care Engine</span>
            <span>Messages synced with clinic staff</span>
          </div>
        </div>
      </div>
    </div>
  );
}
