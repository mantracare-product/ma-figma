import React, { useState, useEffect } from "react";
import DrawerShell from "../ui/DrawerShell";
import {
  Bot,
  MessageSquare,
  Globe,
  Settings,
  Check,
  RotateCcw,
  Info,
  ChevronDown,
  Layers,
  Sparkles,
} from "lucide-react";
import { Tooltip } from "../ui/Tooltip";
import { toast } from "sonner";
import { ChatbotSettings, DEFAULT_CHATBOT_SETTINGS } from "../../../lib/useProcessStore";
import { getStoredWhatsAppNumbers } from "../../../lib/useWhatsAppNumbers";

export interface ChatbotSaveOptions {
  setAsDefault?: boolean;
  applyToCurrentProcess?: boolean;
}

export interface ChatbotChannelDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  stageName?: string;
  processName?: string;
  settings?: ChatbotSettings;
  inboundNumbers?: string[];
  onSave?: (settings: ChatbotSettings, options?: ChatbotSaveOptions) => void;
}

const AVAILABLE_NUMBERS = [
  "+1 (555) 123-4567",
  "+1 (555) 987-6543",
  "+1 (555) 555-1234",
];

const BOT_MODELS = [
  "Gemini 2.5 Flash (Google)",
  "OpenAI - GPT-4o",
  "Claude 3.5 Sonnet (Anthropic)",
  "Llama 3.3 70B",
];

export default function ChatbotChannelDrawer({
  isOpen,
  onClose,
  stageName,
  processName,
  settings,
  inboundNumbers,
  onSave,
}: ChatbotChannelDrawerProps) {
  // Collapsible accordion states
  const [channelsDropdownOpen, setChannelsDropdownOpen] = useState(true);
  const [modelDropdownOpen, setModelDropdownOpen] = useState(true);
  const [scopeDropdownOpen, setScopeDropdownOpen] = useState(false);

  // Channel toggles & values
  const [enableWhatsapp, setEnableWhatsapp] = useState<boolean>(true);
  const [whatsappNumber, setWhatsappNumber] = useState<string>("+1 (555) 123-4567");

  const [enableSms, setEnableSms] = useState<boolean>(true);
  const [smsNumber, setSmsNumber] = useState<string>("+1 (555) 123-4567");

  const [enableWebsite, setEnableWebsite] = useState<boolean>(true);
  const [websiteSource, setWebsiteSource] = useState<string>("https://example.com/widget");

  const [welcomeMessage, setWelcomeMessage] = useState<string>("Hi there! How can I help you today?");
  const [botModel, setBotModel] = useState<string>("Gemini 2.5 Flash (Google)");

  // Scope & Default checkboxes
  const [setAsDefault, setSetAsDefault] = useState(false);
  const [applyToCurrentProcess, setApplyToCurrentProcess] = useState(false);

  const baseNumbers = inboundNumbers && inboundNumbers.length > 0 ? inboundNumbers : AVAILABLE_NUMBERS;
  // Dynamic WhatsApp numbers from store
  const [integratedPhoneOptions, setIntegratedPhoneOptions] = useState<string[]>(baseNumbers);

  useEffect(() => {
    try {
      const waList = getStoredWhatsAppNumbers();
      if (waList && waList.length > 0) {
        const merged = Array.from(new Set([...baseNumbers, ...waList.map((w) => w.displayPhoneNumber)]));
        setIntegratedPhoneOptions(merged);
      } else {
        setIntegratedPhoneOptions(baseNumbers);
      }
    } catch {}
  }, [inboundNumbers]);

  // Sync when settings prop or isOpen changes
  useEffect(() => {
    if (isOpen) {
      const current = settings || DEFAULT_CHATBOT_SETTINGS;
      setEnableWhatsapp(current.enableWhatsapp !== undefined ? current.enableWhatsapp : true);
      setWhatsappNumber(current.whatsappNumber || integratedPhoneOptions[0] || "+1 (555) 123-4567");
      setEnableSms(current.enableSms !== undefined ? current.enableSms : true);
      setSmsNumber(current.smsNumber || integratedPhoneOptions[0] || "+1 (555) 123-4567");
      setEnableWebsite(current.enableWebsite !== undefined ? current.enableWebsite : true);
      setWebsiteSource(current.websiteSource || "https://example.com/widget");
      setWelcomeMessage(current.welcomeMessage || "Hi there! How can I help you today?");
      setBotModel(current.botModel || "Gemini 2.5 Flash (Google)");
      setSetAsDefault(false);
      setApplyToCurrentProcess(false);
    }
  }, [isOpen, settings, integratedPhoneOptions]);

  const handleSave = () => {
    const updated: ChatbotSettings = {
      enableWhatsapp,
      whatsappNumber,
      enableSms,
      smsNumber,
      enableWebsite,
      websiteSource,
      welcomeMessage,
      botModel,
    };

    if (onSave) {
      onSave(updated, { setAsDefault, applyToCurrentProcess });
    }
    onClose();
  };

  const handleResetDefaults = () => {
    setEnableWhatsapp(DEFAULT_CHATBOT_SETTINGS.enableWhatsapp ?? true);
    setWhatsappNumber(DEFAULT_CHATBOT_SETTINGS.whatsappNumber ?? "+1 (555) 123-4567");
    setEnableSms(DEFAULT_CHATBOT_SETTINGS.enableSms ?? true);
    setSmsNumber(DEFAULT_CHATBOT_SETTINGS.smsNumber ?? "+1 (555) 123-4567");
    setEnableWebsite(DEFAULT_CHATBOT_SETTINGS.enableWebsite ?? true);
    setWebsiteSource(DEFAULT_CHATBOT_SETTINGS.websiteSource ?? "https://example.com/widget");
    setWelcomeMessage(DEFAULT_CHATBOT_SETTINGS.welcomeMessage ?? "Hi there! How can I help you today?");
    setBotModel(DEFAULT_CHATBOT_SETTINGS.botModel ?? "Gemini 2.5 Flash (Google)");
    setSetAsDefault(false);
    setApplyToCurrentProcess(false);
    toast.info("Reset to default chatbot settings");
  };

  return (
    <DrawerShell
      isOpen={isOpen}
      onClose={onClose}
      title="Chatbot Channel Settings"
      subtitle={stageName ? `Configure channels, WhatsApp numbers, SMS, and website bot for "${stageName}"` : "Configure channels and AI chatbot settings"}
      icon={<Bot className="w-5 h-5 text-primary" />}
      width="max-w-[540px]"
      footer={
        <div className="flex items-center justify-between w-full">
          <button
            type="button"
            onClick={handleResetDefaults}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
            style={{ fontFamily: "DM Sans, sans-serif" }}
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Reset Defaults
          </button>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
              style={{ fontFamily: "DM Sans, sans-serif" }}
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="flex items-center gap-2 px-5 py-2 text-sm font-semibold text-white bg-primary hover:bg-primary/90 rounded-xl shadow-xs transition-colors cursor-pointer"
              style={{ fontFamily: "DM Sans, sans-serif" }}
            >
              <Check className="w-4 h-4" />
              Save Settings
            </button>
          </div>
        </div>
      }
    >
      <div className="space-y-4">
        {/* SECTION 1: Channels Configuration */}
        <div className="border border-slate-200/80 rounded-2xl overflow-hidden bg-white shadow-xs transition-all">
          <button
            type="button"
            onClick={() => setChannelsDropdownOpen(!channelsDropdownOpen)}
            className="w-full flex items-center justify-between p-4 bg-white hover:bg-slate-50/80 transition-colors text-left cursor-pointer"
          >
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-8 h-8 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-primary shrink-0">
                <MessageSquare className="w-4 h-4" />
              </div>
              <div className="flex flex-col">
                <span
                  className="text-sm font-bold text-[#222222]"
                  style={{ fontFamily: "DM Sans, sans-serif" }}
                >
                  Chatbot Channels & Sources
                </span>
                <span className="text-xs text-slate-500 font-medium">
                  WhatsApp, SMS, and Website live chat
                </span>
              </div>
            </div>
            <ChevronDown
              className={`w-5 h-5 text-slate-400 transition-transform duration-200 ${
                channelsDropdownOpen ? "rotate-180" : ""
              }`}
            />
          </button>

          {channelsDropdownOpen && (
            <div className="p-4 border-t border-slate-100 bg-[#fbfcfd] space-y-4">
              {/* Channel 1: WhatsApp */}
              <div className="p-3.5 bg-white border border-slate-200 rounded-xl space-y-3 shadow-2xs">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <span className="text-lg">💬</span>
                    <div>
                      <span className="text-xs font-bold text-slate-800" style={{ fontFamily: "DM Sans, sans-serif" }}>
                        WhatsApp Channel
                      </span>
                      <p className="text-[11px] text-slate-500">Enable AI conversational bot over WhatsApp</p>
                    </div>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer shrink-0">
                    <input
                      type="checkbox"
                      className="sr-only peer"
                      checked={enableWhatsapp}
                      onChange={(e) => setEnableWhatsapp(e.target.checked)}
                    />
                    <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600 cursor-pointer" />
                  </label>
                </div>

                {enableWhatsapp && (
                  <div className="pt-2 border-t border-slate-100">
                    <div className="flex items-center gap-1.5 mb-1.5">
                      <label className="text-xs font-semibold text-slate-700" style={{ fontFamily: "DM Sans, sans-serif" }}>
                        Integrated Number (Source)
                      </label>
                      <Tooltip text="Select which integrated WhatsApp phone number the chatbot should respond on.">
                        <Info className="w-3.5 h-3.5 text-slate-400 cursor-help" />
                      </Tooltip>
                    </div>
                    <select
                      value={whatsappNumber}
                      onChange={(e) => setWhatsappNumber(e.target.value)}
                      className="w-full px-3 py-2 text-xs sm:text-sm bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary font-medium text-slate-900 cursor-pointer"
                      style={{ fontFamily: "DM Sans, sans-serif" }}
                    >
                      {integratedPhoneOptions.map((num) => (
                        <option key={num} value={num}>
                          {num} (WhatsApp Business)
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              {/* Channel 2: SMS */}
              <div className="p-3.5 bg-white border border-slate-200 rounded-xl space-y-3 shadow-2xs">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <span className="text-lg">📱</span>
                    <div>
                      <span className="text-xs font-bold text-slate-800" style={{ fontFamily: "DM Sans, sans-serif" }}>
                        SMS Channel
                      </span>
                      <p className="text-[11px] text-slate-500">Enable text message conversational bot</p>
                    </div>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer shrink-0">
                    <input
                      type="checkbox"
                      className="sr-only peer"
                      checked={enableSms}
                      onChange={(e) => setEnableSms(e.target.checked)}
                    />
                    <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600 cursor-pointer" />
                  </label>
                </div>

                {enableSms && (
                  <div className="pt-2 border-t border-slate-100">
                    <div className="flex items-center gap-1.5 mb-1.5">
                      <label className="text-xs font-semibold text-slate-700" style={{ fontFamily: "DM Sans, sans-serif" }}>
                        Integrated Number (Source)
                      </label>
                      <Tooltip text="Select which integrated phone number should send and receive SMS text messages.">
                        <Info className="w-3.5 h-3.5 text-slate-400 cursor-help" />
                      </Tooltip>
                    </div>
                    <select
                      value={smsNumber}
                      onChange={(e) => setSmsNumber(e.target.value)}
                      className="w-full px-3 py-2 text-xs sm:text-sm bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary font-medium text-slate-900 cursor-pointer"
                      style={{ fontFamily: "DM Sans, sans-serif" }}
                    >
                      {integratedPhoneOptions.map((num) => (
                        <option key={num} value={num}>
                          {num} (SMS Carrier)
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              {/* Channel 3: Website Chatbot */}
              <div className="p-3.5 bg-white border border-slate-200 rounded-xl space-y-3 shadow-2xs">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <span className="text-lg">🌐</span>
                    <div>
                      <span className="text-xs font-bold text-slate-800" style={{ fontFamily: "DM Sans, sans-serif" }}>
                        Website Chatbot
                      </span>
                      <p className="text-[11px] text-slate-500">Live chat widget embedded on your portal or website</p>
                    </div>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer shrink-0">
                    <input
                      type="checkbox"
                      className="sr-only peer"
                      checked={enableWebsite}
                      onChange={(e) => setEnableWebsite(e.target.checked)}
                    />
                    <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600 cursor-pointer" />
                  </label>
                </div>

                {enableWebsite && (
                  <div className="pt-2 border-t border-slate-100">
                    <div className="flex items-center gap-1.5 mb-1.5">
                      <label className="text-xs font-semibold text-slate-700" style={{ fontFamily: "DM Sans, sans-serif" }}>
                        Website Widget Link / Source URL
                      </label>
                      <Tooltip text="URL where your chatbot widget is deployed or website domain.">
                        <Info className="w-3.5 h-3.5 text-slate-400 cursor-help" />
                      </Tooltip>
                    </div>
                    <input
                      type="text"
                      value={websiteSource}
                      onChange={(e) => setWebsiteSource(e.target.value)}
                      placeholder="https://example.com/widget"
                      className="w-full px-3 py-2 text-xs sm:text-sm bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary font-medium text-slate-900 placeholder:text-slate-400 transition-colors"
                      style={{ fontFamily: "Outfit, sans-serif" }}
                    />
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* SECTION 2: Chatbot Prompt & Welcome Message */}
        <div className="border border-slate-200/80 rounded-2xl overflow-hidden bg-white shadow-xs transition-all">
          <button
            type="button"
            onClick={() => setModelDropdownOpen(!modelDropdownOpen)}
            className="w-full flex items-center justify-between p-4 bg-white hover:bg-slate-50/80 transition-colors text-left cursor-pointer"
          >
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-8 h-8 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600 shrink-0">
                <Sparkles className="w-4 h-4" />
              </div>
              <div className="flex flex-col">
                <span
                  className="text-sm font-bold text-[#222222]"
                  style={{ fontFamily: "DM Sans, sans-serif" }}
                >
                  Chatbot Intelligence & Greeting
                </span>
                <span className="text-xs text-slate-500 font-medium">
                  Underlying model and initial welcome message
                </span>
              </div>
            </div>
            <ChevronDown
              className={`w-5 h-5 text-slate-400 transition-transform duration-200 ${
                modelDropdownOpen ? "rotate-180" : ""
              }`}
            />
          </button>

          {modelDropdownOpen && (
            <div className="p-4 border-t border-slate-100 bg-[#fbfcfd] space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5" style={{ fontFamily: "DM Sans, sans-serif" }}>
                  AI Model
                </label>
                <select
                  value={botModel}
                  onChange={(e) => setBotModel(e.target.value)}
                  className="w-full px-3 py-2 text-xs sm:text-sm bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary font-medium text-slate-900 cursor-pointer"
                  style={{ fontFamily: "DM Sans, sans-serif" }}
                >
                  {BOT_MODELS.map((m) => (
                    <option key={m} value={m}>
                      {m}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5" style={{ fontFamily: "DM Sans, sans-serif" }}>
                  Welcome Greeting
                </label>
                <textarea
                  value={welcomeMessage}
                  onChange={(e) => setWelcomeMessage(e.target.value)}
                  rows={3}
                  placeholder="Hi there! How can I help you today?"
                  className="w-full px-3 py-2 text-xs sm:text-sm bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary font-medium text-slate-900 placeholder:text-slate-400 transition-colors resize-none"
                  style={{ fontFamily: "Outfit, sans-serif" }}
                />
              </div>
            </div>
          )}
        </div>

        {/* SECTION 3: Settings Scope & Defaults */}
        <div className="border border-slate-200/80 rounded-2xl overflow-hidden bg-white shadow-xs transition-all">
          <button
            type="button"
            onClick={() => setScopeDropdownOpen(!scopeDropdownOpen)}
            className="w-full flex items-center justify-between p-4 bg-white hover:bg-slate-50/80 transition-colors text-left cursor-pointer"
          >
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-8 h-8 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-primary shrink-0">
                <Layers className="w-4 h-4" />
              </div>
              <div className="flex items-center gap-1.5">
                <span
                  className="text-sm font-bold text-[#222222]"
                  style={{ fontFamily: "DM Sans, sans-serif" }}
                >
                  Settings Scope & Defaults
                </span>
                <Tooltip text="Choose whether these chatbot settings apply across all stages.">
                  <Info className="w-3.5 h-3.5 text-slate-400 cursor-help hover:text-slate-600 transition-colors" />
                </Tooltip>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {(setAsDefault || applyToCurrentProcess) && (
                <span
                  className="text-xs font-semibold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700"
                  style={{ fontFamily: "Outfit, sans-serif" }}
                >
                  {setAsDefault ? "Global Default" : "Process Only"}
                </span>
              )}
              <ChevronDown
                className={`w-5 h-5 text-slate-400 transition-transform duration-200 ${
                  scopeDropdownOpen ? "rotate-180" : ""
                }`}
              />
            </div>
          </button>

          {scopeDropdownOpen && (
            <div className="p-4 border-t border-slate-100 bg-[#fbfcfd] space-y-3">
              {/* Checkbox 1: Set Default */}
              <label className="flex items-center gap-2.5 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={setAsDefault}
                  onChange={(e) => {
                    const checked = e.target.checked;
                    setSetAsDefault(checked);
                    if (checked) {
                      setApplyToCurrentProcess(false);
                    }
                  }}
                  className="w-4 h-4 rounded border-slate-300 text-primary focus:ring-primary/20 cursor-pointer accent-blue-600 shrink-0"
                />
                <span
                  className="text-xs font-semibold text-slate-800"
                  style={{ fontFamily: "DM Sans, sans-serif" }}
                >
                  Set as Default Chatbot Settings
                </span>
                <Tooltip text="Automatically applied to newly configured stages across all processes.">
                  <Info className="w-3.5 h-3.5 text-slate-400 hover:text-slate-600 cursor-help transition-colors" />
                </Tooltip>
              </label>

              {/* Checkbox 2: Apply to All */}
              <label
                className={`flex items-center gap-2.5 cursor-pointer select-none ${
                  setAsDefault ? "opacity-50 pointer-events-none" : ""
                }`}
              >
                <input
                  type="checkbox"
                  checked={applyToCurrentProcess}
                  disabled={setAsDefault}
                  onChange={(e) => setApplyToCurrentProcess(e.target.checked)}
                  className="w-4 h-4 rounded border-slate-300 text-primary focus:ring-primary/20 cursor-pointer accent-blue-600 shrink-0"
                />
                <span
                  className="text-xs font-semibold text-slate-800"
                  style={{ fontFamily: "DM Sans, sans-serif" }}
                >
                  Apply to All Stages in this Process
                </span>
                <Tooltip
                  text={`Apply these chatbot channel settings to all stages in this process only${
                    processName ? ` (${processName})` : ""
                  }.`}
                >
                  <Info className="w-3.5 h-3.5 text-slate-400 hover:text-slate-600 cursor-help transition-colors" />
                </Tooltip>
              </label>
            </div>
          )}
        </div>
      </div>
    </DrawerShell>
  );
}
