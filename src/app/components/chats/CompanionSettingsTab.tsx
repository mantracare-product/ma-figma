import React, { useState, useEffect } from "react";
import {
  Bot,
  Sparkles,
  ShieldCheck,
  Check,
  Send,
  Sliders,
  Palette,
  MessageSquare,
  HelpCircle,
  Plus,
  Trash2,
  Calendar,
  Receipt,
  ClipboardList,
  CheckCircle2,
  Lock,
  ArrowRight,
  Info,
  RefreshCw,
} from "lucide-react";
import {
  getCompanionWidgetConfig,
  saveCompanionWidgetConfig,
  CompanionWidgetConfig,
  CompanionIntentPrompt,
  DEFAULT_COMPANION_INTENTS,
} from "../../../lib/companionWidgetStore";
import { toast } from "sonner";

interface CompanionSettingsTabProps {
  onNavigateToInbox?: () => void;
  registerSaveHandler?: (fn: () => void) => void;
  searchQuery?: string;
  onClearSearch?: () => void;
}

const PRESET_COLORS = [
  "#2563EB", // MantraCare Blue
  "#10B981", // Clinical Emerald
  "#6366F1", // Indigo
  "#8B5CF6", // Purple
  "#0EA5E9", // Sky Blue
  "#1E293B", // Slate Navy
];

export default function CompanionSettingsTab({
  onNavigateToInbox,
  registerSaveHandler,
  searchQuery = "",
}: CompanionSettingsTabProps) {
  const [config, setConfig] = useState<CompanionWidgetConfig>(getCompanionWidgetConfig);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  // Preview interactive state
  const [previewMessages, setPreviewMessages] = useState<
    Array<{ id: string; sender: "bot" | "user"; text: string; actionLabel?: string }>
  >([]);
  const [previewInput, setPreviewInput] = useState("");

  // Sync initial preview messages from config
  useEffect(() => {
    setPreviewMessages([
      {
        id: "msg-init",
        sender: "bot",
        text: config.welcomeMessage || "Hi there! How can we help you today?",
      },
    ]);
  }, [config.welcomeMessage]);

  const handleSave = () => {
    saveCompanionWidgetConfig(config);
    setHasUnsavedChanges(false);
    toast.success("Companion Care Bot settings saved successfully!");
  };

  useEffect(() => {
    if (registerSaveHandler) {
      registerSaveHandler(handleSave);
    }
  }, [registerSaveHandler, config]);

  const updateConfig = (patch: Partial<CompanionWidgetConfig>) => {
    setConfig((prev) => ({ ...prev, ...patch }));
    setHasUnsavedChanges(true);
  };

  const handleToggleIntent = (id: string) => {
    const updated = config.intents.map((item) =>
      item.id === id ? { ...item, enabled: !item.enabled } : item
    );
    updateConfig({ intents: updated });
  };

  const handleUpdateIntentText = (id: string, label: string, reply: string) => {
    const updated = config.intents.map((item) =>
      item.id === id ? { ...item, label, botReply: reply } : item
    );
    updateConfig({ intents: updated });
  };

  const handlePreviewSend = (customText?: string) => {
    const textToSend = customText || previewInput;
    if (!textToSend.trim()) return;

    const userMsg = { id: `u-${Date.now()}`, sender: "user" as const, text: textToSend };
    setPreviewMessages((prev) => [...prev, userMsg]);
    if (!customText) setPreviewInput("");

    // Simulate smart Care Bot response matching intent
    setTimeout(() => {
      const lower = textToSend.toLowerCase();
      let matchedIntent = config.intents.find(
        (i) => i.enabled && lower.includes(i.label.toLowerCase().replace(/^[^\w\s]+/, "").trim())
      );

      if (!matchedIntent) {
        if (lower.includes("book") || lower.includes("appointment") || lower.includes("doctor")) {
          matchedIntent = config.intents.find((i) => i.intent === "book");
        } else if (lower.includes("bill") || lower.includes("invoice") || lower.includes("pay")) {
          matchedIntent = config.intents.find((i) => i.intent === "bills");
        } else if (lower.includes("form") || lower.includes("intake") || lower.includes("questionnaire")) {
          matchedIntent = config.intents.find((i) => i.intent === "forms");
        } else if (lower.includes("checkin") || lower.includes("check in") || lower.includes("arrived")) {
          matchedIntent = config.intents.find((i) => i.intent === "checkin");
        }
      }

      if (matchedIntent) {
        setPreviewMessages((prev) => [
          ...prev,
          {
            id: `b-${Date.now()}`,
            sender: "bot",
            text: matchedIntent.botReply,
            actionLabel: matchedIntent.actionLabel,
          },
        ]);
      } else {
        setPreviewMessages((prev) => [
          ...prev,
          {
            id: `b-${Date.now()}`,
            sender: "bot",
            text: `I've noted that! Since you're signed into Companion, our care team has received your request and will follow up shortly.`,
          },
        ]);
      }
    }, 450);
  };

  return (
    <div className="space-y-6 pb-12 animate-in fade-in duration-200">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Configuration Forms (7 cols) */}
        <div className="lg:col-span-7 space-y-5">
          {/* 1. Default Welcome Message & Intent Matcher */}
          <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs p-5 space-y-4">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-900" style={{ fontFamily: "Outfit, sans-serif" }}>
                  1. Intent-Matching First Message
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  The initial greeting presented to the patient. It immediately focuses on their intent without asking for redundant info.
                </p>
              </div>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                Default Prompt
              </span>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700" style={{ fontFamily: "Outfit, sans-serif" }}>
                Welcome & Intent Message
              </label>
              <textarea
                rows={3}
                value={config.welcomeMessage}
                onChange={(e) => updateConfig({ welcomeMessage: e.target.value })}
                placeholder="Hi there! How can we help you today?"
                className="w-full text-xs font-medium text-slate-800 p-3 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/30 transition-all resize-none"
              />
              <p className="text-[11px] text-slate-400">
                Tip: Keep it friendly and concise so patients immediately click an intent or type their question.
              </p>
            </div>

            {/* Zero Intake Form Guarantee Callout */}
            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 flex items-start gap-3">
              <div className="w-7 h-7 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0 mt-0.5">
                <Lock className="w-4 h-4" />
              </div>
              <div className="space-y-0.5 min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-bold text-slate-800" style={{ fontFamily: "Outfit, sans-serif" }}>
                    No Name / Phone Intake Required
                  </span>
                  <span className="px-1.5 py-0.2 rounded text-[9px] font-bold uppercase bg-emerald-100 text-emerald-800">
                    Bypassed
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 leading-relaxed">
                  Because patients in Companion are already authenticated, Care Bot never prompts for contact details or phone verification. The conversation is instantly connected to their patient record.
                </p>
              </div>
            </div>
          </div>

          {/* 2. Interactive Intent Quick Prompts */}
          <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-900" style={{ fontFamily: "Outfit, sans-serif" }}>
                  2. Quick Intent Action Chips
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Suggestions displayed below the welcome message for one-tap patient routing.
                </p>
              </div>
              <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-slate-600">
                <input
                  type="checkbox"
                  checked={config.showIntentChips}
                  onChange={(e) => updateConfig({ showIntentChips: e.target.checked })}
                  className="rounded text-blue-600 focus:ring-blue-500"
                />
                <span>Show Chips</span>
              </label>
            </div>

            <div className="space-y-2.5">
              {config.intents.map((intent) => (
                <div
                  key={intent.id}
                  className={`p-3 rounded-xl border transition-all ${
                    intent.enabled
                      ? "bg-white border-slate-200 shadow-2xs"
                      : "bg-slate-50/60 border-dashed border-slate-200 opacity-60"
                  }`}
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2 min-w-0">
                      <input
                        type="checkbox"
                        checked={intent.enabled}
                        onChange={() => handleToggleIntent(intent.id)}
                        className="rounded text-blue-600 focus:ring-blue-500 cursor-pointer"
                        title="Toggle intent chip"
                      />
                      <input
                        type="text"
                        value={intent.label}
                        onChange={(e) =>
                          handleUpdateIntentText(intent.id, e.target.value, intent.botReply)
                        }
                        className="text-xs font-bold text-slate-800 bg-transparent border-b border-transparent hover:border-slate-300 focus:border-blue-500 focus:outline-none px-1 py-0.5 truncate"
                        style={{ fontFamily: "Outfit, sans-serif" }}
                      />
                    </div>

                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 font-semibold uppercase">
                      {intent.intent}
                    </span>
                  </div>

                  {intent.enabled && (
                    <div className="mt-2 pl-6 space-y-1">
                      <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                        Care Bot Instant Response
                      </label>
                      <input
                        type="text"
                        value={intent.botReply}
                        onChange={(e) =>
                          handleUpdateIntentText(intent.id, intent.label, e.target.value)
                        }
                        className="w-full text-[11px] text-slate-600 bg-slate-50 border border-slate-200/80 rounded-lg px-2.5 py-1.5 focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                      />
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* 3. Bot Identity & Aesthetic Styling */}
          <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs p-5 space-y-4">
            <div>
              <h3 className="text-sm font-bold text-slate-900" style={{ fontFamily: "Outfit, sans-serif" }}>
                3. Identity & Appearance
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Customize the Care Bot name and theme color inside the portal.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700" style={{ fontFamily: "Outfit, sans-serif" }}>
                  Bot Display Name
                </label>
                <div className="relative">
                  <Bot className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    value={config.botName}
                    onChange={(e) => updateConfig({ botName: e.target.value })}
                    placeholder="Care Bot"
                    className="w-full text-xs font-semibold pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700" style={{ fontFamily: "Outfit, sans-serif" }}>
                  Primary Theme Color
                </label>
                <div className="flex items-center gap-2">
                  {PRESET_COLORS.map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => updateConfig({ themeColor: c })}
                      className={`w-7 h-7 rounded-xl transition-all cursor-pointer flex items-center justify-center ${
                        config.themeColor === c ? "ring-2 ring-offset-2 ring-slate-800 scale-105" : "hover:scale-105"
                      }`}
                      style={{ backgroundColor: c }}
                      title={c}
                    >
                      {config.themeColor === c && <Check className="w-3.5 h-3.5 text-white" />}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="space-y-1.5 pt-2 border-t border-slate-100">
              <label className="text-xs font-bold text-slate-700" style={{ fontFamily: "Outfit, sans-serif" }}>
                Escalation Keywords (Transfer to Staff Inbox)
              </label>
              <input
                type="text"
                value={config.aiHandoffPhrases}
                onChange={(e) => updateConfig({ aiHandoffPhrases: e.target.value })}
                placeholder="talk to doctor, reception, emergency, urgent"
                className="w-full text-xs font-medium px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/30"
              />
              <p className="text-[11px] text-slate-400">
                When a patient types any of these terms, the chat triggers an immediate notification to clinic staff.
              </p>
            </div>
          </div>
        </div>

        {/* Right Column: Live Interactive Portal Preview (5 cols) */}
        <div className="lg:col-span-5 sticky top-6">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-lg overflow-hidden flex flex-col h-[640px]">
            {/* Mock Phone / Portal Header */}
            <div
              className="p-4 text-white flex items-center justify-between transition-colors shadow-xs"
              style={{ backgroundColor: config.themeColor }}
            >
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-white/20 backdrop-blur-xs flex items-center justify-center font-bold text-white shadow-2xs">
                  <Bot className="w-4 h-4 text-white" />
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-bold text-white" style={{ fontFamily: "Outfit, sans-serif" }}>
                      {config.botName || "Care Bot"}
                    </span>
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  </div>
                  <span className="text-[10px] text-white/80 block">
                    MantraCare Companion • Online
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  setPreviewMessages([
                    {
                      id: "msg-init",
                      sender: "bot",
                      text: config.welcomeMessage || "Hi there! How can we help you today?",
                    },
                  ]);
                }}
                className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white/90 text-xs transition-colors cursor-pointer"
                title="Reset preview chat"
              >
                <RefreshCw className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Authenticated Patient Pill */}
            <div className="px-4 py-1.5 bg-slate-50 border-b border-slate-100 flex items-center justify-between text-[11px] text-slate-500 font-medium">
              <span className="flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5 text-blue-600" />
                Signed in: <b className="text-slate-800">Sarah Johnson (#CL-001)</b>
              </span>
              <span className="text-[10px] font-mono text-emerald-600 font-bold">Verified</span>
            </div>

            {/* Chat Messages Body */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-[#F8FAFC]">
              {previewMessages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex flex-col ${msg.sender === "user" ? "items-end" : "items-start"}`}
                >
                  <div
                    className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-xs shadow-2xs leading-relaxed ${
                      msg.sender === "user"
                        ? "bg-slate-900 text-white rounded-tr-xs"
                        : "bg-white text-slate-800 border border-slate-200/90 rounded-tl-xs"
                    }`}
                  >
                    {msg.text}
                  </div>

                  {msg.actionLabel && (
                    <div className="mt-2 w-full max-w-[85%]">
                      <div className="p-2.5 rounded-xl bg-white border border-blue-200/80 shadow-2xs flex items-center justify-between gap-2">
                        <span className="text-xs font-bold text-slate-800" style={{ fontFamily: "Outfit, sans-serif" }}>
                          {msg.actionLabel}
                        </span>
                        <span
                          className="px-2.5 py-1 rounded-lg text-[10px] font-bold text-white shadow-2xs"
                          style={{ backgroundColor: config.themeColor }}
                        >
                          Open &rarr;
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              ))}

              {/* Quick Intent Chips (shown when enabled) */}
              {config.showIntentChips && previewMessages.length <= 2 && (
                <div className="pt-2 space-y-1.5 animate-in fade-in duration-300">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block px-1">
                    Quick Assistance
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {config.intents
                      .filter((i) => i.enabled)
                      .map((intent) => (
                        <button
                          key={intent.id}
                          type="button"
                          onClick={() => handlePreviewSend(intent.label)}
                          className="px-2.5 py-1.5 rounded-xl bg-white hover:bg-slate-100/90 border border-slate-200 text-xs font-semibold text-slate-700 transition-all shadow-2xs hover:shadow-xs cursor-pointer active:scale-95 text-left"
                          style={{ fontFamily: "Outfit, sans-serif" }}
                        >
                          {intent.label}
                        </button>
                      ))}
                  </div>
                </div>
              )}
            </div>

            {/* Mock Composer */}
            <div className="p-3 bg-white border-t border-slate-200 flex items-center gap-2">
              <input
                type="text"
                value={previewInput}
                onChange={(e) => setPreviewInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handlePreviewSend();
                  }
                }}
                placeholder="Ask Care Bot a question..."
                className="flex-1 text-xs px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 text-slate-800"
              />
              <button
                type="button"
                onClick={() => handlePreviewSend()}
                className="w-8 h-8 rounded-xl text-white flex items-center justify-center shrink-0 shadow-2xs hover:opacity-90 transition-opacity cursor-pointer"
                style={{ backgroundColor: config.themeColor }}
                title="Send test message"
              >
                <Send className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
