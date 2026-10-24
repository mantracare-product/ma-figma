import React, { useState, useEffect } from "react";
import {
  Bot,
  Sparkles,
  ShieldCheck,
  Check,
  Send,
  Plus,
  Trash2,
  Lock,
  RefreshCw,
} from "lucide-react";
import {
  getCompanionWidgetConfig,
  saveCompanionWidgetConfig,
  CompanionWidgetConfig,
  CompanionRequirementItem,
} from "../../../lib/companionWidgetStore";
import { getStoredProcesses } from "../../../lib/useProcessStore";
import { toast } from "sonner";
import { InfoTooltip } from "../help/InfoTooltip";

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
}: CompanionSettingsTabProps) {
  const [config, setConfig] = useState<CompanionWidgetConfig>(getCompanionWidgetConfig);
  const [processes] = useState(() => getStoredProcesses());

  // Preview interactive state
  const [previewMessages, setPreviewMessages] = useState<
    Array<{ id: string; sender: "bot" | "user"; text: string; processName?: string }>
  >([]);
  const [selectedReqId, setSelectedReqId] = useState<string>("");
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
    if (config.requirements?.length > 0 && !selectedReqId) {
      setSelectedReqId(config.requirements[0].id);
    }
  }, [config.welcomeMessage, config.requirements]);

  const handleSave = () => {
    saveCompanionWidgetConfig(config);
    toast.success("Companion Care Bot settings saved successfully!");
  };

  useEffect(() => {
    if (registerSaveHandler) {
      registerSaveHandler(handleSave);
    }
  }, [registerSaveHandler, config]);

  const updateConfig = (patch: Partial<CompanionWidgetConfig>) => {
    setConfig((prev) => ({ ...prev, ...patch }));
  };

  // Requirement management matching WebsiteWidgetSettingsTab
  const handleAddRequirement = () => {
    const newReq: CompanionRequirementItem = {
      id: `req-${Date.now()}`,
      label: "New Patient Requirement",
      processId: processes[0]?.id || "1",
    };
    updateConfig({
      requirements: [...config.requirements, newReq],
    });
  };

  const handleUpdateRequirement = (index: number, field: "label" | "processId", value: string) => {
    const updated = [...config.requirements];
    updated[index] = { ...updated[index], [field]: value };
    updateConfig({ requirements: updated });
  };

  const handleRemoveRequirement = (index: number) => {
    if (config.requirements.length <= 1) return;
    const updated = config.requirements.filter((_, i) => i !== index);
    updateConfig({ requirements: updated });
  };

  const handlePreviewSend = (customReqId?: string) => {
    const reqId = customReqId || selectedReqId;
    const matchedReq = config.requirements.find((r) => r.id === reqId);
    const targetProcess = processes.find((p) => p.id === matchedReq?.processId);

    const userText = previewInput.trim()
      ? `${matchedReq ? `[${matchedReq.label}] ` : ""}${previewInput.trim()}`
      : matchedReq?.label || "General Inquiry";

    const userMsg = { id: `u-${Date.now()}`, sender: "user" as const, text: userText };
    setPreviewMessages((prev) => [...prev, userMsg]);
    setPreviewInput("");

    setTimeout(() => {
      setPreviewMessages((prev) => [
        ...prev,
        {
          id: `b-${Date.now()}`,
          sender: "bot",
          text: `I've mapped your request to our "${targetProcess?.name || "Patient Care"}" process. Our care team has been notified and you can track your journey right here in Companion.`,
          processName: targetProcess?.name,
        },
      ]);
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
                  The initial greeting presented to the patient. It focuses on their intent without asking for redundant info.
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
                Tip: Keep it friendly and concise so patients immediately select their requirement or state their issue.
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
                  Because patients in Companion are already authenticated, Care Bot never prompts for contact details or phone numbers. The conversation is linked to their patient chart.
                </p>
              </div>
            </div>
          </div>

          {/* 2. Requirement to Process Mapping (Matching Website Widget) */}
          <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <h3 className="text-sm font-bold text-slate-900" style={{ fontFamily: "Outfit, sans-serif" }}>
                  2. Requirement to Process Mapping
                </h3>
                <InfoTooltip text="Map each client requirement choice to its target process for automatic workflow routing and intake" />
              </div>
              <button
                type="button"
                onClick={handleAddRequirement}
                className="text-xs font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1 cursor-pointer bg-blue-50 hover:bg-blue-100/70 px-2.5 py-1 rounded-lg transition-colors"
                style={{ fontFamily: "Outfit, sans-serif" }}
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Requirement</span>
              </button>
            </div>

            <p className="text-xs text-slate-500">
              When a patient opens the Care Bot, they can select their requirement to route their inquiry directly into the appropriate clinic process.
            </p>

            <div className="space-y-2.5">
              {(config.requirements || []).map((req, idx) => (
                <div key={req.id || idx} className="flex items-center gap-2">
                  <input
                    type="text"
                    value={req.label}
                    onChange={(e) => handleUpdateRequirement(idx, "label", e.target.value)}
                    placeholder="Requirement (e.g. Book an Appointment)"
                    className="flex-1 text-xs border border-slate-200 rounded-xl p-2 bg-slate-50 focus:bg-white text-slate-800 font-medium outline-none focus:ring-1 focus:ring-blue-500"
                    style={{ fontFamily: "Outfit, sans-serif" }}
                  />
                  <span className="text-xs text-slate-400 font-mono">→</span>
                  <select
                    value={req.processId}
                    onChange={(e) => handleUpdateRequirement(idx, "processId", e.target.value)}
                    className="flex-1 text-xs border border-slate-200 rounded-xl p-2 bg-slate-50 focus:bg-white text-slate-800 font-medium outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer"
                    style={{ fontFamily: "Outfit, sans-serif" }}
                  >
                    {processes.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                  {config.requirements.length > 1 && (
                    <button
                      type="button"
                      onClick={() => handleRemoveRequirement(idx)}
                      className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg cursor-pointer transition-colors"
                      title="Remove requirement"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
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

                  {msg.processName && (
                    <div className="mt-1.5">
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 border border-blue-200/60 font-mono">
                        Mapped to: {msg.processName}
                      </span>
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Requirement Form Selector & Composer (Matching Website Widget Pre-chat requirement selector) */}
            <div className="p-3 bg-white border-t border-slate-200 space-y-2">
              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                  Select Requirement (Process)
                </label>
                <select
                  value={selectedReqId}
                  onChange={(e) => setSelectedReqId(e.target.value)}
                  className="w-full text-xs font-semibold px-2.5 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer"
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

              <div className="flex items-center gap-2">
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
                  placeholder="Ask a question or explain requirement..."
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
    </div>
  );
}
