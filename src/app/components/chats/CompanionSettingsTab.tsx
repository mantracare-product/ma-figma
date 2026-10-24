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
  Settings as SettingsIcon,
  Smartphone,
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
  isDrawer?: boolean;
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
  registerSaveHandler,
  isDrawer = false,
}: CompanionSettingsTabProps) {
  const [config, setConfig] = useState<CompanionWidgetConfig>(getCompanionWidgetConfig);
  const [processes] = useState(() => getStoredProcesses());
  const [drawerSubTab, setDrawerSubTab] = useState<"settings" | "preview">("settings");

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

  const renderForms = () => (
    <div className="space-y-4">
      {/* 1. Default Welcome Message & Intent Matcher */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs p-4.5 space-y-3.5">
        <div className="flex items-start justify-between">
          <div>
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider" style={{ fontFamily: "Outfit, sans-serif" }}>
              1. Intent-Matching First Message
            </h3>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Initial greeting shown to the patient to immediately focus on their intent.
            </p>
          </div>
          <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
            Default Prompt
          </span>
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-bold text-slate-700" style={{ fontFamily: "Outfit, sans-serif" }}>
            Welcome Greeting
          </label>
          <textarea
            rows={2}
            value={config.welcomeMessage}
            onChange={(e) => updateConfig({ welcomeMessage: e.target.value })}
            placeholder="Hi there! How can we help you today?"
            className="w-full text-xs font-medium text-slate-800 p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 transition-all resize-none"
          />
        </div>

        {/* Zero Intake Form Guarantee Callout */}
        <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80 flex items-start gap-2.5">
          <div className="w-6 h-6 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0 mt-0.5">
            <Lock className="w-3.5 h-3.5" />
          </div>
          <div className="space-y-0.5 min-w-0">
            <span className="text-[11px] font-bold text-slate-800 block" style={{ fontFamily: "Outfit, sans-serif" }}>
              Pre-authenticated Client Mode
            </span>
            <p className="text-[11px] text-slate-500 leading-relaxed">
              Patients are already logged into Companion. Care Bot never asks for name, email, or phone. All messages link automatically.
            </p>
          </div>
        </div>
      </div>

      {/* 2. Requirement to Process Mapping (Matching Website Widget) */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs p-4.5 space-y-3.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider" style={{ fontFamily: "Outfit, sans-serif" }}>
              2. Requirement to Process Mapping
            </h3>
            <InfoTooltip text="Map each client requirement choice to its target process for automatic workflow routing and intake" />
          </div>
          <button
            type="button"
            onClick={handleAddRequirement}
            className="text-xs font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1 cursor-pointer bg-blue-50 hover:bg-blue-100/70 px-2 py-1 rounded-lg transition-colors"
            style={{ fontFamily: "Outfit, sans-serif" }}
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add</span>
          </button>
        </div>

        <div className="space-y-2">
          {(config.requirements || []).map((req, idx) => (
            <div key={req.id || idx} className="flex items-center gap-2">
              <input
                type="text"
                value={req.label}
                onChange={(e) => handleUpdateRequirement(idx, "label", e.target.value)}
                placeholder="Requirement label"
                className="flex-1 text-xs border border-slate-200 rounded-xl p-2 bg-slate-50 focus:bg-white text-slate-800 font-medium outline-none focus:ring-1 focus:ring-blue-500"
                style={{ fontFamily: "Outfit, sans-serif" }}
              />
              <span className="text-xs text-slate-400 font-mono">→</span>
              <select
                value={req.processId}
                onChange={(e) => handleUpdateRequirement(idx, "processId", e.target.value)}
                className="flex-1 text-xs border border-slate-200 rounded-xl p-2 bg-slate-50 focus:bg-white text-slate-800 font-medium outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer truncate"
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
                  className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg cursor-pointer transition-colors"
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
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs p-4.5 space-y-3.5">
        <div>
          <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider" style={{ fontFamily: "Outfit, sans-serif" }}>
            3. Identity & Appearance
          </h3>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="space-y-1">
            <label className="text-[11px] font-bold text-slate-700" style={{ fontFamily: "Outfit, sans-serif" }}>
              Bot Name
            </label>
            <div className="relative">
              <Bot className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
              <input
                type="text"
                value={config.botName}
                onChange={(e) => updateConfig({ botName: e.target.value })}
                placeholder="Care Bot"
                className="w-full text-xs font-semibold pl-8 pr-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-[11px] font-bold text-slate-700" style={{ fontFamily: "Outfit, sans-serif" }}>
              Theme Color
            </label>
            <div className="flex items-center gap-1.5 pt-0.5">
              {PRESET_COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => updateConfig({ themeColor: c })}
                  className={`w-6 h-6 rounded-lg transition-all cursor-pointer flex items-center justify-center ${
                    config.themeColor === c ? "ring-2 ring-offset-2 ring-slate-800 scale-105" : "hover:scale-105"
                  }`}
                  style={{ backgroundColor: c }}
                  title={c}
                >
                  {config.themeColor === c && <Check className="w-3 h-3 text-white" />}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="space-y-1 pt-1.5 border-t border-slate-100">
          <label className="text-[11px] font-bold text-slate-700" style={{ fontFamily: "Outfit, sans-serif" }}>
            Escalation Phrases (Handoff to Staff)
          </label>
          <input
            type="text"
            value={config.aiHandoffPhrases}
            onChange={(e) => updateConfig({ aiHandoffPhrases: e.target.value })}
            placeholder="talk to doctor, reception, emergency, urgent"
            className="w-full text-xs font-medium px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>
      </div>
    </div>
  );

  const renderPreview = () => (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col h-[520px]">
      {/* Mock Portal Header */}
      <div
        className="p-3 text-white flex items-center justify-between transition-colors shadow-xs"
        style={{ backgroundColor: config.themeColor }}
      >
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-white/20 backdrop-blur-xs flex items-center justify-center font-bold text-white shadow-2xs">
            <Bot className="w-3.5 h-3.5 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-bold text-white" style={{ fontFamily: "Outfit, sans-serif" }}>
                {config.botName || "Care Bot"}
              </span>
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            </div>
            <span className="text-[9px] text-white/80 block">
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
          className="p-1 rounded-md bg-white/10 hover:bg-white/20 text-white text-xs transition-colors cursor-pointer"
          title="Reset preview"
        >
          <RefreshCw className="w-3 h-3" />
        </button>
      </div>

      {/* Authenticated Patient Strip */}
      <div className="px-3 py-1 bg-slate-50 border-b border-slate-100 flex items-center justify-between text-[10px] text-slate-500 font-medium">
        <span className="flex items-center gap-1">
          <ShieldCheck className="w-3 h-3 text-blue-600" />
          Patient: <b className="text-slate-800">Sarah Johnson (#CL-001)</b>
        </span>
        <span className="text-[9px] font-mono text-emerald-600 font-bold">Verified</span>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2.5 bg-[#F8FAFC]">
        {previewMessages.map((msg) => (
          <div
            key={msg.id}
            className={`flex flex-col ${msg.sender === "user" ? "items-end" : "items-start"}`}
          >
            <div
              className={`max-w-[88%] rounded-2xl px-3 py-2 text-xs shadow-2xs leading-relaxed ${
                msg.sender === "user"
                  ? "bg-slate-900 text-white rounded-tr-xs"
                  : "bg-white text-slate-800 border border-slate-200/90 rounded-tl-xs"
              }`}
            >
              {msg.text}
            </div>

            {msg.processName && (
              <div className="mt-1">
                <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-blue-50 text-blue-700 border border-blue-200/60 font-mono">
                  Mapped: {msg.processName}
                </span>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Requirement Selector & Input */}
      <div className="p-2.5 bg-white border-t border-slate-200 space-y-1.5">
        <div className="flex items-center gap-1.5">
          <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400 shrink-0">
            Requirement:
          </span>
          <select
            value={selectedReqId}
            onChange={(e) => setSelectedReqId(e.target.value)}
            className="flex-1 text-[11px] font-semibold px-2 py-1 rounded-lg bg-slate-50 border border-slate-200 text-slate-800 focus:bg-white focus:outline-none cursor-pointer truncate"
            style={{ fontFamily: "Outfit, sans-serif" }}
          >
            {config.requirements.map((req) => (
              <option key={req.id} value={req.id}>
                {req.label}
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-1.5">
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
            placeholder="Type question or hit send..."
            className="flex-1 text-xs px-2.5 py-1.5 rounded-xl bg-slate-50 border border-slate-200 focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 text-slate-800"
          />
          <button
            type="button"
            onClick={() => handlePreviewSend()}
            className="w-7 h-7 rounded-xl text-white flex items-center justify-center shrink-0 shadow-2xs hover:opacity-90 transition-opacity cursor-pointer"
            style={{ backgroundColor: config.themeColor }}
            title="Send test message"
          >
            <Send className="w-3 h-3" />
          </button>
        </div>
      </div>
    </div>
  );

  // If in a drawer, provide tab toggles between configuration and live preview
  if (isDrawer) {
    return (
      <div className="p-4 space-y-4">
        <div className="flex items-center justify-between border-b border-slate-200 pb-2.5">
          <div className="inline-flex items-center p-0.5 bg-slate-100 rounded-xl gap-1">
            <button
              type="button"
              onClick={() => setDrawerSubTab("settings")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                drawerSubTab === "settings"
                  ? "bg-white text-slate-900 shadow-2xs"
                  : "text-slate-500 hover:text-slate-800"
              }`}
              style={{ fontFamily: "Outfit, sans-serif" }}
            >
              <SettingsIcon className="w-3.5 h-3.5" />
              <span>Settings</span>
            </button>
            <button
              type="button"
              onClick={() => setDrawerSubTab("preview")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                drawerSubTab === "preview"
                  ? "bg-white text-slate-900 shadow-2xs"
                  : "text-slate-500 hover:text-slate-800"
              }`}
              style={{ fontFamily: "Outfit, sans-serif" }}
            >
              <Smartphone className="w-3.5 h-3.5" />
              <span>Live Preview</span>
            </button>
          </div>

          <span className="text-[10px] text-slate-400 font-mono">
            {config.requirements.length} requirements mapped
          </span>
        </div>

        {drawerSubTab === "settings" ? renderForms() : renderPreview()}
      </div>
    );
  }

  // Full page view (non-drawer fallback)
  return (
    <div className="space-y-6 pb-12 animate-in fade-in duration-200">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        <div className="lg:col-span-7">{renderForms()}</div>
        <div className="lg:col-span-5 sticky top-6">{renderPreview()}</div>
      </div>
    </div>
  );
}
