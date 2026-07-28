import React, { useState, useEffect } from "react";
import {
  Globe,
  Palette,
  MessageSquare,
  Sparkles,
  Check,
  Send,
  User,
  Mail,
  Phone,
  Layers,
  Bot,
  Code,
  Copy,
  Tag,
  Edit3,
} from "lucide-react";
import {
  getWebsiteWidgetConfig,
  saveWebsiteWidgetConfig,
  WebsiteWidgetConfig,
} from "../../../lib/websiteWidgetStore";
import { getStoredProcesses } from "../../../lib/useProcessStore";
import { processWebsiteVisitorSubmission } from "../../../lib/websiteChatSimulator";
import { toast } from "sonner";

interface WebsiteWidgetSettingsTabProps {
  onNavigateToInbox?: () => void;
}

const PRESET_COLORS = [
  "#1E88E5", // Blue
  "#10B981", // Emerald
  "#8B5CF6", // Purple
  "#F59E0B", // Amber
  "#EF4444", // Red
  "#0F172A", // Dark Slate
];

export default function WebsiteWidgetSettingsTab({ onNavigateToInbox }: WebsiteWidgetSettingsTabProps) {
  const [config, setConfig] = useState<WebsiteWidgetConfig>(getWebsiteWidgetConfig);
  const processes = getStoredProcesses();

  // Test Visitor Simulator State
  const [simName, setSimName] = useState("");
  const [simEmail, setSimEmail] = useState("");
  const [simPhone, setSimPhone] = useState("");
  const [simProcessId, setSimProcessId] = useState(config.defaultProcessId || (processes[0]?.id ?? "1"));
  const [simMessage, setSimMessage] = useState("");
  const [simHistory, setSimHistory] = useState<Array<{ sender: "user" | "bot"; text: string; header?: any; buttons?: any[] }>>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [copiedSnippet, setCopiedSnippet] = useState(false);

  useEffect(() => {
    saveWebsiteWidgetConfig(config);
  }, [config]);

  const handleSave = () => {
    saveWebsiteWidgetConfig(config);
    toast.success("Website widget settings saved!");
  };

  const handleLabelChange = (processId: string, customLabel: string) => {
    setConfig((prev) => ({
      ...prev,
      processLabelMap: {
        ...prev.processLabelMap,
        [processId]: customLabel,
      },
    }));
  };

  const embedScriptSnippet = `<script 
  src="https://app.mantraassist.com/widget.js" 
  data-bot-name="${config.botName.replace(/"/g, '&quot;')}"
  data-theme-color="${config.themeColor}"
  data-theme-mode="${config.themeMode}"
  async
></script>`;

  const handleCopyCode = () => {
    navigator.clipboard.writeText(embedScriptSnippet);
    setCopiedSnippet(true);
    toast.success("Widget embed code copied to clipboard!");
    setTimeout(() => setCopiedSnippet(false), 3000);
  };

  const handleRunSimulator = (e: React.FormEvent) => {
    e.preventDefault();
    if (!simName.trim()) {
      toast.error("Please enter a visitor name for the test submission.");
      return;
    }
    if (!simMessage.trim()) {
      toast.error("Please enter a test message.");
      return;
    }

    setIsSubmitting(true);
    const selectedLabel = config.processLabelMap[simProcessId];
    const result = processWebsiteVisitorSubmission({
      name: simName,
      email: simEmail,
      phone: simPhone,
      processId: simProcessId,
      firstMessage: simMessage,
      requirementLabel: selectedLabel,
    });

    setIsSubmitting(false);

    if (result) {
      setSimHistory([
        { sender: "user", text: simMessage },
        {
          sender: "bot",
          text: result.botReply,
          header: result.header,
          buttons: result.buttons,
        },
      ]);
      toast.success(
        `Website visitor created! Client: "${simName}" enrolled in "${result.processName}" at stage "${result.stageName}".`,
        {
          action: onNavigateToInbox ? {
            label: "Open Inbox",
            onClick: onNavigateToInbox,
          } : undefined,
        }
      );
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex items-center justify-between pb-4 border-b border-gray-200">
        <div>
          <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2" style={{ fontFamily: "DM Sans, sans-serif" }}>
            <Globe className="w-5 h-5 text-purple-600" /> Website Widget Settings
          </h2>
          <p className="text-xs text-gray-500 mt-1" style={{ fontFamily: "Outfit, sans-serif" }}>
            Configure theme, custom requirement labels, intake forms, and embed the chatbot on your site.
          </p>
        </div>
        <button
          type="button"
          onClick={handleSave}
          className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-semibold text-xs transition-colors shadow-sm"
          style={{ fontFamily: "Outfit, sans-serif" }}
        >
          Save Configuration
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Settings & Custom Labels */}
        <div className="lg:col-span-7 space-y-6">
          {/* Section 1: Appearance & Theme */}
          <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-4 shadow-xs">
            <div className="flex items-center gap-2 text-sm font-bold text-gray-900 border-b border-gray-100 pb-3" style={{ fontFamily: "DM Sans, sans-serif" }}>
              <Palette className="w-4 h-4 text-purple-600" />
              <span>Theme & Colors</span>
            </div>

            {/* Accent Color Palette */}
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-2" style={{ fontFamily: "Outfit, sans-serif" }}>
                Widget Primary Color
              </label>
              <div className="flex items-center gap-3">
                {PRESET_COLORS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setConfig((prev) => ({ ...prev, themeColor: c }))}
                    className="w-8 h-8 rounded-full flex items-center justify-center border-2 transition-transform hover:scale-105"
                    style={{ backgroundColor: c, borderColor: config.themeColor === c ? "#000" : "transparent" }}
                  >
                    {config.themeColor === c && <Check className="w-4 h-4 text-white" />}
                  </button>
                ))}
                <input
                  type="color"
                  value={config.themeColor}
                  onChange={(e) => setConfig((prev) => ({ ...prev, themeColor: e.target.value }))}
                  className="w-8 h-8 rounded-lg cursor-pointer border-none bg-transparent"
                  title="Custom Color"
                />
              </div>
            </div>

            {/* Theme Mode */}
            <div className="pt-1">
              <label className="block text-xs font-semibold text-gray-700 mb-1" style={{ fontFamily: "Outfit, sans-serif" }}>
                Theme Mode
              </label>
              <select
                value={config.themeMode}
                onChange={(e) => setConfig((prev) => ({ ...prev, themeMode: e.target.value as any }))}
                className="w-full text-xs border border-gray-200 rounded-lg p-2 focus:ring-2 focus:ring-purple-500 bg-white"
                style={{ fontFamily: "Outfit, sans-serif" }}
              >
                <option value="light">Light Mode</option>
                <option value="dark">Dark Mode</option>
              </select>
            </div>
          </div>

          {/* Section 2: Branding & Bot Details */}
          <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-4 shadow-xs">
            <div className="flex items-center gap-2 text-sm font-bold text-gray-900 border-b border-gray-100 pb-3" style={{ fontFamily: "DM Sans, sans-serif" }}>
              <Bot className="w-4 h-4 text-purple-600" />
              <span>Branding & Header</span>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1" style={{ fontFamily: "Outfit, sans-serif" }}>
                Bot / Brand Name
              </label>
              <input
                type="text"
                value={config.botName}
                onChange={(e) => setConfig((prev) => ({ ...prev, botName: e.target.value }))}
                placeholder="e.g. MantraAssist Support"
                className="w-full text-xs border border-gray-200 rounded-lg p-2.5 focus:ring-2 focus:ring-purple-500"
                style={{ fontFamily: "Outfit, sans-serif" }}
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1" style={{ fontFamily: "Outfit, sans-serif" }}>
                Welcome Greeting Message
              </label>
              <textarea
                value={config.welcomeMessage}
                onChange={(e) => setConfig((prev) => ({ ...prev, welcomeMessage: e.target.value }))}
                rows={2}
                placeholder="Initial message shown to visitors..."
                className="w-full text-xs border border-gray-200 rounded-lg p-2.5 focus:ring-2 focus:ring-purple-500"
                style={{ fontFamily: "Outfit, sans-serif" }}
              />
            </div>
          </div>

          {/* Section 3: Default Pre-Chat Form & Custom Requirement Labels */}
          <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-4 shadow-xs">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <div className="flex items-center gap-2 text-sm font-bold text-gray-900" style={{ fontFamily: "DM Sans, sans-serif" }}>
                <Layers className="w-4 h-4 text-purple-600" />
                <span>Pre-Chat Form & Requirement Labels</span>
              </div>
              <label className="flex items-center gap-2 text-xs font-semibold text-gray-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={config.enablePreChatForm}
                  onChange={(e) => setConfig((prev) => ({ ...prev, enablePreChatForm: e.target.checked }))}
                  className="rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                />
                Enable Form
              </label>
            </div>

            {config.enablePreChatForm && (
              <>
                <p className="text-xs text-gray-500" style={{ fontFamily: "Outfit, sans-serif" }}>
                  Select the intake fields collected from web visitors before starting the conversation.
                </p>

                <div className="grid grid-cols-2 gap-3 pt-1">
                  <label className="flex items-center gap-2 text-xs text-gray-700 p-2 border border-gray-200 rounded-lg cursor-pointer bg-gray-50/50">
                    <input
                      type="checkbox"
                      checked={config.formFields.name}
                      onChange={(e) =>
                        setConfig((prev) => ({
                          ...prev,
                          formFields: { ...prev.formFields, name: e.target.checked },
                        }))
                      }
                      className="rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                    />
                    <User className="w-3.5 h-3.5 text-gray-500" /> Full Name
                  </label>

                  <label className="flex items-center gap-2 text-xs text-gray-700 p-2 border border-gray-200 rounded-lg cursor-pointer bg-gray-50/50">
                    <input
                      type="checkbox"
                      checked={config.formFields.email}
                      onChange={(e) =>
                        setConfig((prev) => ({
                          ...prev,
                          formFields: { ...prev.formFields, email: e.target.checked },
                        }))
                      }
                      className="rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                    />
                    <Mail className="w-3.5 h-3.5 text-gray-500" /> Email Address
                  </label>

                  <label className="flex items-center gap-2 text-xs text-gray-700 p-2 border border-gray-200 rounded-lg cursor-pointer bg-gray-50/50">
                    <input
                      type="checkbox"
                      checked={config.formFields.phone}
                      onChange={(e) =>
                        setConfig((prev) => ({
                          ...prev,
                          formFields: { ...prev.formFields, phone: e.target.checked },
                        }))
                      }
                      className="rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                    />
                    <Phone className="w-3.5 h-3.5 text-gray-500" /> Phone Number
                  </label>

                  <label className="flex items-center gap-2 text-xs text-gray-700 p-2 border border-gray-200 rounded-lg cursor-pointer bg-gray-50/50">
                    <input
                      type="checkbox"
                      checked={config.formFields.processSelect}
                      onChange={(e) =>
                        setConfig((prev) => ({
                          ...prev,
                          formFields: { ...prev.formFields, processSelect: e.target.checked },
                        }))
                      }
                      className="rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                    />
                    <Tag className="w-3.5 h-3.5 text-gray-500" /> Requirement Selection
                  </label>
                </div>

                {/* Custom Requirement Labels Mapping Editor */}
                <div className="pt-3 border-t border-gray-100 space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="block text-xs font-bold text-gray-800" style={{ fontFamily: "DM Sans, sans-serif" }}>
                      Custom Requirement Display Labels
                    </label>
                    <span className="text-[10px] text-gray-400">Maps internal process to public visitor label</span>
                  </div>

                  <div className="space-y-2.5">
                    {processes.map((p) => {
                      const currentLabel = config.processLabelMap[p.id] ?? p.name;
                      return (
                        <div key={p.id} className="p-3 border border-gray-200 rounded-xl bg-gray-50/40 space-y-1.5">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-semibold text-gray-700 flex items-center gap-1.5" style={{ fontFamily: "Outfit, sans-serif" }}>
                              <Layers className="w-3.5 h-3.5 text-purple-600" /> Process: <span className="font-bold text-gray-900">{p.name}</span>
                            </span>
                            <span className="text-[10px] text-gray-400 font-mono">ID: {p.id}</span>
                          </div>

                          <div className="relative">
                            <input
                              type="text"
                              value={currentLabel}
                              onChange={(e) => handleLabelChange(p.id, e.target.value)}
                              placeholder={`Public label for ${p.name}`}
                              className="w-full text-xs border border-gray-200 rounded-lg p-2 pl-7 bg-white focus:ring-2 focus:ring-purple-500"
                              style={{ fontFamily: "Outfit, sans-serif" }}
                            />
                            <Edit3 className="w-3.5 h-3.5 text-gray-400 absolute left-2 top-1/2 -translate-y-1/2" />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="pt-2">
                  <label className="block text-xs font-semibold text-gray-700 mb-1" style={{ fontFamily: "Outfit, sans-serif" }}>
                    Default Pre-Selected Requirement
                  </label>
                  <select
                    value={config.defaultProcessId}
                    onChange={(e) => setConfig((prev) => ({ ...prev, defaultProcessId: e.target.value }))}
                    className="w-full text-xs border border-gray-200 rounded-lg p-2.5 focus:ring-2 focus:ring-purple-500 bg-white"
                    style={{ fontFamily: "Outfit, sans-serif" }}
                  >
                    {processes.map((p) => (
                      <option key={p.id} value={p.id}>
                        {config.processLabelMap[p.id] || p.name} (Internal: {p.name})
                      </option>
                    ))}
                  </select>
                </div>
              </>
            )}
          </div>

          {/* Section 4: Copy Website Embed Script */}
          <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-3 shadow-xs">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <div className="flex items-center gap-2 text-sm font-bold text-gray-900" style={{ fontFamily: "DM Sans, sans-serif" }}>
                <Code className="w-4 h-4 text-purple-600" />
                <span>Embed Widget Code</span>
              </div>
              <button
                type="button"
                onClick={handleCopyCode}
                className="px-3 py-1.5 bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200 rounded-lg font-semibold text-xs transition-colors flex items-center gap-1.5"
                style={{ fontFamily: "Outfit, sans-serif" }}
              >
                {copiedSnippet ? <Check className="w-3.5 h-3.5 text-green-600" /> : <Copy className="w-3.5 h-3.5" />}
                {copiedSnippet ? "Copied!" : "Copy Code"}
              </button>
            </div>

            <p className="text-xs text-gray-500" style={{ fontFamily: "Outfit, sans-serif" }}>
              Paste this HTML snippet right before the closing <code className="text-purple-600 bg-purple-50 px-1 py-0.5 rounded">&lt;/body&gt;</code> tag of your website to install the chatbot widget.
            </p>

            <div className="relative bg-slate-900 rounded-xl p-3.5 overflow-x-auto text-xs font-mono text-slate-200 border border-slate-800">
              <pre>{embedScriptSnippet}</pre>
            </div>
          </div>
        </div>

        {/* Right Column: Live Interactive Widget Simulator */}
        <div className="lg:col-span-5 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-gray-900 flex items-center gap-1.5" style={{ fontFamily: "DM Sans, sans-serif" }}>
              <Sparkles className="w-4 h-4 text-purple-600" /> Live Widget Simulator
            </h3>
            <span className="text-[11px] bg-purple-50 text-purple-700 font-semibold px-2 py-0.5 rounded-full border border-purple-200">
              Interactive Preview
            </span>
          </div>

          {/* Widget Card Container */}
          <div
            className={`rounded-2xl border border-gray-200 shadow-lg overflow-hidden transition-all ${
              config.themeMode === "dark" ? "bg-slate-900 text-white" : "bg-white text-gray-900"
            }`}
          >
            {/* Widget Top Bar */}
            <div
              className="p-4 flex items-center justify-between text-white shadow-xs"
              style={{ backgroundColor: config.themeColor }}
            >
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center font-bold text-xs">
                  <Bot className="w-4 h-4 text-white" />
                </div>
                <div>
                  <h4 className="text-xs font-bold leading-tight" style={{ fontFamily: "DM Sans, sans-serif" }}>
                    {config.botName || "MantraAssist Support"}
                  </h4>
                  <span className="text-[10px] text-white/80">Online · Powered by MantraAssist</span>
                </div>
              </div>
              <Globe className="w-4 h-4 text-white/70" />
            </div>

            {/* Widget Body / Simulator Form */}
            <div className="p-4 space-y-4 max-h-[500px] overflow-y-auto">
              {/* Welcome Message Bubble */}
              <div className="flex items-start gap-2">
                <div
                  className="w-6 h-6 rounded-full text-white flex items-center justify-center text-[10px] flex-shrink-0 mt-0.5"
                  style={{ backgroundColor: config.themeColor }}
                >
                  <Bot className="w-3.5 h-3.5" />
                </div>
                <div
                  className={`p-3 rounded-2xl rounded-tl-xs text-xs max-w-[85%] ${
                    config.themeMode === "dark" ? "bg-slate-800 text-slate-100" : "bg-gray-100 text-gray-800"
                  }`}
                  style={{ fontFamily: "Outfit, sans-serif" }}
                >
                  {config.welcomeMessage}
                </div>
              </div>

              {/* Form Input Area */}
              <form onSubmit={handleRunSimulator} className="space-y-3 pt-2">
                <div className="p-3.5 rounded-xl border border-gray-200/80 bg-gray-50/50 dark:bg-slate-800/50 space-y-2.5">
                  <p className="text-[11px] font-bold text-gray-600 dark:text-slate-300" style={{ fontFamily: "DM Sans, sans-serif" }}>
                    {config.enablePreChatForm ? "Complete form to start chat:" : "Test conversation:"}
                  </p>

                  {config.enablePreChatForm && config.formFields.name && (
                    <div>
                      <input
                        type="text"
                        value={simName}
                        onChange={(e) => setSimName(e.target.value)}
                        placeholder="Visitor Name *"
                        className="w-full text-xs border border-gray-200 dark:border-slate-700 rounded-lg p-2 bg-white dark:bg-slate-900"
                        style={{ fontFamily: "Outfit, sans-serif" }}
                        required
                      />
                    </div>
                  )}

                  {config.enablePreChatForm && config.formFields.email && (
                    <div>
                      <input
                        type="email"
                        value={simEmail}
                        onChange={(e) => setSimEmail(e.target.value)}
                        placeholder="Email Address"
                        className="w-full text-xs border border-gray-200 dark:border-slate-700 rounded-lg p-2 bg-white dark:bg-slate-900"
                        style={{ fontFamily: "Outfit, sans-serif" }}
                      />
                    </div>
                  )}

                  {config.enablePreChatForm && config.formFields.phone && (
                    <div>
                      <input
                        type="text"
                        value={simPhone}
                        onChange={(e) => setSimPhone(e.target.value)}
                        placeholder="Phone Number"
                        className="w-full text-xs border border-gray-200 dark:border-slate-700 rounded-lg p-2 bg-white dark:bg-slate-900"
                        style={{ fontFamily: "Outfit, sans-serif" }}
                      />
                    </div>
                  )}

                  {config.enablePreChatForm && config.formFields.processSelect && (
                    <div>
                      <select
                        value={simProcessId}
                        onChange={(e) => setSimProcessId(e.target.value)}
                        className="w-full text-xs border border-gray-200 dark:border-slate-700 rounded-lg p-2 bg-white dark:bg-slate-900 font-medium"
                        style={{ fontFamily: "Outfit, sans-serif" }}
                      >
                        {processes.map((p) => (
                          <option key={p.id} value={p.id}>
                            Requirement: {config.processLabelMap[p.id] || p.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  <div>
                    <input
                      type="text"
                      value={simMessage}
                      onChange={(e) => setSimMessage(e.target.value)}
                      placeholder="Type your message..."
                      className="w-full text-xs border border-gray-200 dark:border-slate-700 rounded-lg p-2 bg-white dark:bg-slate-900"
                      style={{ fontFamily: "Outfit, sans-serif" }}
                      required
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full py-2.5 text-white font-semibold text-xs rounded-xl flex items-center justify-center gap-2 shadow-xs transition-opacity hover:opacity-90 disabled:opacity-50"
                  style={{ backgroundColor: config.themeColor, fontFamily: "Outfit, sans-serif" }}
                >
                  <Send className="w-3.5 h-3.5" /> Submit & Start Chat
                </button>
              </form>

              {/* Chat Simulation Output */}
              {simHistory.length > 0 && (
                <div className="pt-3 border-t border-gray-200 dark:border-slate-700 space-y-2.5">
                  <p className="text-[11px] font-bold text-gray-500" style={{ fontFamily: "Outfit, sans-serif" }}>
                    Automated Bot Response:
                  </p>
                  {simHistory.map((m, idx) => (
                    <div
                      key={idx}
                      className={`flex flex-col ${m.sender === "user" ? "items-end" : "items-start"}`}
                    >
                      <div
                        className={`p-3 rounded-2xl text-xs max-w-[90%] space-y-1 ${
                          m.sender === "user"
                            ? "bg-purple-600 text-white rounded-br-xs"
                            : "bg-gray-100 dark:bg-slate-800 text-gray-900 dark:text-slate-100 rounded-bl-xs"
                        }`}
                        style={{ fontFamily: "Outfit, sans-serif" }}
                      >
                        {m.header?.text && (
                          <div className="font-bold text-[11px] pb-1 border-b border-gray-200/40">
                            {m.header.text}
                          </div>
                        )}
                        <p>{m.text}</p>

                        {m.buttons && m.buttons.length > 0 && (
                          <div className="pt-2 flex flex-wrap gap-1.5">
                            {m.buttons.map((b, bi) => (
                              <span
                                key={bi}
                                className="px-2 py-0.5 bg-white/20 text-white rounded-full text-[10px] font-medium"
                              >
                                {b.label}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
