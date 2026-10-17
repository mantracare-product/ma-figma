import React, { useState, useEffect } from "react";
import DrawerShell from "../ui/DrawerShell";
import {
  Bot,
  MessageSquare,
  MessageCircle,
  Smartphone,
  Globe,
  Settings,
  Check,
  RotateCcw,
  Info,
  ChevronDown,
  Layers,
  Sparkles,
  Cpu,
  UserPlus,
  Phone,
} from "lucide-react";
import { Tooltip } from "../ui/Tooltip";
import { toast } from "sonner";
import { ChatbotSettings, DEFAULT_CHATBOT_SETTINGS } from "../../../lib/useProcessStore";
import { useAIModels } from "../../../lib/aiModelsStore";
import { getStoredWhatsAppNumbers, saveStoredWhatsAppNumbers } from "../../../lib/useWhatsAppNumbers";
import MultiSelectNumberDropdown from "./MultiSelectNumberDropdown";

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

const DEFAULT_NUMBERS = [
  "+1 (555) 123-4567",
  "+1 (555) 987-6543",
  "+1 (555) 555-1234",
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

  // Dynamic LLM models from store
  const { activeModels } = useAIModels();

  // Channel toggles & values
  const [enableWhatsapp, setEnableWhatsapp] = useState<boolean>(true);
  const [whatsappNumber, setWhatsappNumber] = useState<string>("+1 (555) 123-4567");
  const [whatsappNumbers, setWhatsappNumbers] = useState<string[]>(["+1 (555) 123-4567"]);

  const [enableSms, setEnableSms] = useState<boolean>(true);
  const [smsNumber, setSmsNumber] = useState<string>("+1 (555) 123-4567");
  const [smsNumbers, setSmsNumbers] = useState<string[]>(["+1 (555) 123-4567"]);

  const [enableWebsite, setEnableWebsite] = useState<boolean>(true);
  const [websiteSource, setWebsiteSource] = useState<string>("https://example.com/widget");

  const [welcomeMessage, setWelcomeMessage] = useState<string>("Hi there! How can I help you today?");
  const [botModel, setBotModel] = useState<string>("Gemini 2.5 Flash");
  const [autoCreateClient, setAutoCreateClient] = useState<boolean>(true);

  // Scope & Default checkboxes
  const [setAsDefault, setSetAsDefault] = useState(false);
  const [applyToCurrentProcess, setApplyToCurrentProcess] = useState(false);

  // Channel phone numbers list
  const baseNumbers = inboundNumbers && inboundNumbers.length > 0 ? inboundNumbers : DEFAULT_NUMBERS;
  const [whatsappNumberList, setWhatsappNumberList] = useState<string[]>(baseNumbers);
  const [smsNumberList, setSmsNumberList] = useState<string[]>(baseNumbers);

  useEffect(() => {
    try {
      const waList = getStoredWhatsAppNumbers();
      if (waList && waList.length > 0) {
        const waPhones = waList.map((w) => w.displayPhoneNumber);
        const mergedWa = Array.from(new Set([...baseNumbers, ...waPhones]));
        setWhatsappNumberList(mergedWa);
        setSmsNumberList(mergedWa);
      } else {
        setWhatsappNumberList(baseNumbers);
        setSmsNumberList(baseNumbers);
      }
    } catch {
      setWhatsappNumberList(baseNumbers);
      setSmsNumberList(baseNumbers);
    }
  }, [inboundNumbers]);

  // Sync when settings prop or isOpen changes
  useEffect(() => {
    if (isOpen) {
      const current = settings || DEFAULT_CHATBOT_SETTINGS;
      setEnableWhatsapp(current.enableWhatsapp !== undefined ? current.enableWhatsapp : true);

      // WhatsApp multi-select sync
      const initWaNums =
        current.whatsappNumbers && current.whatsappNumbers.length > 0
          ? current.whatsappNumbers
          : current.whatsappNumber
          ? [current.whatsappNumber]
          : [whatsappNumberList[0] || "+1 (555) 123-4567"];
      setWhatsappNumbers(initWaNums);
      setWhatsappNumber(initWaNums[0] || "+1 (555) 123-4567");

      // SMS multi-select sync
      setEnableSms(current.enableSms !== undefined ? current.enableSms : true);
      const initSmsNums =
        current.smsNumbers && current.smsNumbers.length > 0
          ? current.smsNumbers
          : current.smsNumber
          ? [current.smsNumber]
          : [smsNumberList[0] || "+1 (555) 123-4567"];
      setSmsNumbers(initSmsNums);
      setSmsNumber(initSmsNums[0] || "+1 (555) 123-4567");

      setEnableWebsite(current.enableWebsite !== undefined ? current.enableWebsite : true);
      setWebsiteSource(current.websiteSource || "https://example.com/widget");
      setWelcomeMessage(current.welcomeMessage || "Hi there! How can I help you today?");
      
      // Match active model if possible
      const matched = activeModels.find(
        (m) => m.name === current.botModel || `${m.name} (${m.provider})` === current.botModel
      );
      setBotModel(matched ? matched.name : current.botModel || activeModels[0]?.name || "Gemini 2.5 Flash");
      
      setAutoCreateClient(current.autoCreateClient !== undefined ? current.autoCreateClient : true);
      setSetAsDefault(false);
      setApplyToCurrentProcess(false);
    }
  }, [isOpen, settings, activeModels, whatsappNumberList, smsNumberList]);

  const handleAddWaNumber = (newNum: string) => {
    if (!whatsappNumberList.includes(newNum)) {
      const updated = [...whatsappNumberList, newNum];
      setWhatsappNumberList(updated);
      try {
        const existing = getStoredWhatsAppNumbers();
        saveStoredWhatsAppNumbers([
          ...existing,
          {
            id: `wa-${Date.now()}`,
            displayPhoneNumber: newNum,
            name: `WhatsApp (${newNum})`,
          },
        ]);
      } catch {}
    }
  };

  const handleAddSmsNumber = (newNum: string) => {
    if (!smsNumberList.includes(newNum)) {
      setSmsNumberList([...smsNumberList, newNum]);
    }
  };

  const handleSave = () => {
    const updated: ChatbotSettings = {
      enableWhatsapp,
      whatsappNumber: whatsappNumbers[0] || "",
      whatsappNumbers,
      enableSms,
      smsNumber: smsNumbers[0] || "",
      smsNumbers,
      enableWebsite,
      websiteSource,
      welcomeMessage,
      botModel,
      autoCreateClient,
    };

    if (onSave) {
      onSave(updated, { setAsDefault, applyToCurrentProcess });
    }
    onClose();
  };

  const handleResetDefaults = () => {
    setEnableWhatsapp(DEFAULT_CHATBOT_SETTINGS.enableWhatsapp ?? true);
    const defaultWa = DEFAULT_CHATBOT_SETTINGS.whatsappNumbers || [
      DEFAULT_CHATBOT_SETTINGS.whatsappNumber || "+1 (555) 123-4567",
    ];
    setWhatsappNumbers(defaultWa);
    setWhatsappNumber(defaultWa[0] || "+1 (555) 123-4567");

    setEnableSms(DEFAULT_CHATBOT_SETTINGS.enableSms ?? true);
    const defaultSms = DEFAULT_CHATBOT_SETTINGS.smsNumbers || [
      DEFAULT_CHATBOT_SETTINGS.smsNumber || "+1 (555) 123-4567",
    ];
    setSmsNumbers(defaultSms);
    setSmsNumber(defaultSms[0] || "+1 (555) 123-4567");

    setEnableWebsite(DEFAULT_CHATBOT_SETTINGS.enableWebsite ?? true);
    setWebsiteSource(DEFAULT_CHATBOT_SETTINGS.websiteSource ?? "https://example.com/widget");
    setWelcomeMessage(DEFAULT_CHATBOT_SETTINGS.welcomeMessage ?? "Hi there! How can I help you today?");
    setBotModel(DEFAULT_CHATBOT_SETTINGS.botModel ?? (activeModels[0]?.name || "Gemini 2.5 Flash"));
    setAutoCreateClient(DEFAULT_CHATBOT_SETTINGS.autoCreateClient ?? true);
    setSetAsDefault(false);
    setApplyToCurrentProcess(false);
    toast.info("Reset to default chatbot settings");
  };

  return (
    <DrawerShell
      isOpen={isOpen}
      onClose={onClose}
      title="Chatbot Channel Settings"
      subtitle={stageName ? `Configure channels and AI chatbot settings for "${stageName}"` : "Configure channels and AI chatbot settings"}
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
              <div className="flex items-center gap-1.5">
                <span
                  className="text-sm font-bold text-[#222222]"
                  style={{ fontFamily: "DM Sans, sans-serif" }}
                >
                  Chatbot Channels & Sources
                </span>
                <Tooltip text="Enable or disable communication channels for the conversational AI bot.">
                  <Info className="w-3.5 h-3.5 text-slate-400 cursor-help hover:text-slate-600 transition-colors" />
                </Tooltip>
              </div>
            </div>
            <ChevronDown
              className={`w-5 h-5 text-slate-400 transition-transform duration-200 ${
                channelsDropdownOpen ? "rotate-180" : ""
              }`}
            />
          </button>

          {channelsDropdownOpen && (
            <div className="p-4 border-t border-slate-100 bg-[#fbfcfd] space-y-3.5">
              {/* Source 1: WhatsApp Channel */}
              <div className="p-3.5 bg-white border border-slate-200/90 rounded-xl shadow-2xs hover:border-slate-300 transition-all space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-8 h-8 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600 shrink-0">
                      <MessageCircle className="w-4 h-4" />
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-bold text-slate-800" style={{ fontFamily: "DM Sans, sans-serif" }}>
                        WhatsApp Channel
                      </span>
                      <Tooltip text="Enable AI conversational bot over WhatsApp.">
                        <Info className="w-3.5 h-3.5 text-slate-400 cursor-help hover:text-slate-600 transition-colors" />
                      </Tooltip>
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
                  <div className="pt-2.5 border-t border-slate-100 space-y-2">
                    <div className="flex items-center gap-1.5">
                      <Phone className="w-3.5 h-3.5 text-emerald-600" />
                      <span className="text-xs font-semibold text-slate-700" style={{ fontFamily: "DM Sans, sans-serif" }}>
                        Channel Phone Numbers
                      </span>
                      <Tooltip text="Select multiple WhatsApp numbers for this workflow, or add new numbers inside the dropdown.">
                        <Info className="w-3.5 h-3.5 text-slate-400 cursor-help hover:text-slate-600 transition-colors" />
                      </Tooltip>
                    </div>

                    <MultiSelectNumberDropdown
                      selected={whatsappNumbers}
                      onChange={(nums) => {
                        setWhatsappNumbers(nums);
                        setWhatsappNumber(nums[0] || "");
                      }}
                      options={whatsappNumberList}
                      onAddOption={handleAddWaNumber}
                      palette="emerald"
                      placeholder="Select WhatsApp phone numbers..."
                      badgeSuffix="WhatsApp Business"
                    />
                  </div>
                )}
              </div>

              {/* Source 2: SMS Channel */}
              <div className="p-3.5 bg-white border border-slate-200/90 rounded-xl shadow-2xs hover:border-slate-300 transition-all space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-8 h-8 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 shrink-0">
                      <Smartphone className="w-4 h-4" />
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-bold text-slate-800" style={{ fontFamily: "DM Sans, sans-serif" }}>
                        SMS Channel
                      </span>
                      <Tooltip text="Enable text message conversational AI bot over SMS.">
                        <Info className="w-3.5 h-3.5 text-slate-400 cursor-help hover:text-slate-600 transition-colors" />
                      </Tooltip>
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
                  <div className="pt-2.5 border-t border-slate-100 space-y-2">
                    <div className="flex items-center gap-1.5">
                      <Phone className="w-3.5 h-3.5 text-blue-600" />
                      <span className="text-xs font-semibold text-slate-700" style={{ fontFamily: "DM Sans, sans-serif" }}>
                        Channel Phone Numbers
                      </span>
                      <Tooltip text="Select multiple SMS carrier numbers for this workflow, or add new numbers inside the dropdown.">
                        <Info className="w-3.5 h-3.5 text-slate-400 cursor-help hover:text-slate-600 transition-colors" />
                      </Tooltip>
                    </div>

                    <MultiSelectNumberDropdown
                      selected={smsNumbers}
                      onChange={(nums) => {
                        setSmsNumbers(nums);
                        setSmsNumber(nums[0] || "");
                      }}
                      options={smsNumberList}
                      onAddOption={handleAddSmsNumber}
                      palette="blue"
                      placeholder="Select SMS phone numbers..."
                      badgeSuffix="SMS Carrier"
                    />
                  </div>
                )}
              </div>

              {/* Source 3: Website Chatbot */}
              <div className="p-3.5 bg-white border border-slate-200/90 rounded-xl shadow-2xs hover:border-slate-300 transition-all space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-8 h-8 rounded-xl bg-purple-50 border border-purple-100 flex items-center justify-center text-purple-600 shrink-0">
                      <Globe className="w-4 h-4" />
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-bold text-slate-800" style={{ fontFamily: "DM Sans, sans-serif" }}>
                        Website Chatbot
                      </span>
                      <Tooltip text="Live chat widget embedded on your portal or website.">
                        <Info className="w-3.5 h-3.5 text-slate-400 cursor-help hover:text-slate-600 transition-colors" />
                      </Tooltip>
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
                  <div className="pt-2.5 border-t border-slate-100 space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <Globe className="w-3.5 h-3.5 text-purple-600" />
                        <span className="text-xs font-semibold text-slate-700" style={{ fontFamily: "DM Sans, sans-serif" }}>
                          Widget Link / Source URL
                        </span>
                        <Tooltip text="Website URL or integration identifier where your live chatbot is embedded.">
                          <Info className="w-3.5 h-3.5 text-slate-400 cursor-help hover:text-slate-600 transition-colors" />
                        </Tooltip>
                      </div>
                    </div>
                    <input
                      type="text"
                      value={websiteSource}
                      onChange={(e) => setWebsiteSource(e.target.value)}
                      placeholder="Mantra AI Web Widget or https://example.com/widget"
                      className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 font-medium text-slate-800 shadow-2xs"
                      style={{ fontFamily: "Outfit, sans-serif" }}
                    />
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* SECTION 2: Chatbot Intelligence & Settings */}
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
              <div className="flex items-center gap-1.5">
                <span
                  className="text-sm font-bold text-[#222222]"
                  style={{ fontFamily: "DM Sans, sans-serif" }}
                >
                  Chatbot Intelligence & Settings
                </span>
                <Tooltip text="Underlying LLM model and automated client creation settings.">
                  <Info className="w-3.5 h-3.5 text-slate-400 cursor-help hover:text-slate-600 transition-colors" />
                </Tooltip>
              </div>
            </div>
            <ChevronDown
              className={`w-5 h-5 text-slate-400 transition-transform duration-200 ${
                modelDropdownOpen ? "rotate-180" : ""
              }`}
            />
          </button>

          {modelDropdownOpen && (
            <div className="p-4 border-t border-slate-100 bg-[#fbfcfd] space-y-3.5">
              {/* AI Model Selection */}
              <div className="space-y-1.5 p-3.5 bg-white border border-slate-200/90 rounded-xl shadow-2xs">
                <div className="flex items-center gap-1.5">
                  <Cpu className="w-3.5 h-3.5 text-emerald-600" />
                  <label className="text-xs font-bold text-slate-800" style={{ fontFamily: "DM Sans, sans-serif" }}>
                    AI Model
                  </label>
                  <Tooltip text="Select the LLM model that powers conversational logic and chat responses.">
                    <Info className="w-3.5 h-3.5 text-slate-400 cursor-help hover:text-slate-600 transition-colors" />
                  </Tooltip>
                </div>
                <div className="relative">
                  <select
                    value={botModel}
                    onChange={(e) => setBotModel(e.target.value)}
                    className="w-full px-3 py-2 text-xs sm:text-sm bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary font-medium text-slate-900 cursor-pointer shadow-2xs pr-8 appearance-none"
                    style={{ fontFamily: "DM Sans, sans-serif" }}
                  >
                    {activeModels.map((m) => (
                      <option key={m.id} value={m.name}>
                        {m.name} ({m.provider})
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>
              </div>

              {/* Auto-create Client Toggle */}
              <div className="flex items-center justify-between p-3.5 bg-white border border-slate-200/90 rounded-xl shadow-2xs hover:border-slate-300 transition-all">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-8 h-8 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 shrink-0">
                    <UserPlus className="w-4 h-4" />
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-bold text-slate-800" style={{ fontFamily: "DM Sans, sans-serif" }}>
                      Auto-create Client
                    </span>
                    <Tooltip text="Automatically create a new client contact record in your CRM when a visitor starts a conversation.">
                      <Info className="w-3.5 h-3.5 text-slate-400 cursor-help hover:text-slate-600 transition-colors" />
                    </Tooltip>
                  </div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer shrink-0">
                  <input
                    type="checkbox"
                    className="sr-only peer"
                    checked={autoCreateClient}
                    onChange={(e) => setAutoCreateClient(e.target.checked)}
                  />
                  <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600 cursor-pointer" />
                </label>
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
