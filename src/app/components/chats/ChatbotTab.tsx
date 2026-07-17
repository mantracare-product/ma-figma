import React, { useState, useEffect, useRef } from "react";
import { toast } from "sonner";
import {
  MessageCircle,
  MessageSquare,
  Search,
  Check,
  CheckCheck,
  Plus,
  Trash2,
  Pencil,
  Info,
  X,
  ChevronRight,
  ChevronDown,
  Bot,
  Settings,
  Clock,
  Shield,
  Calendar,
  AlertTriangle,
  Globe,
  UserCheck,
  Volume2,
  Copy,
  Laptop,
  Smartphone,
  PlusCircle,
  ArrowLeft,
  Settings2
} from "lucide-react";

import {
  Campaign,
  BusinessInfoItem,
  EscalationRule,
  AccordionSection,
} from "../../pages/Chats";

import { Button } from "../ui/Button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";

export type ChannelType = "whatsapp" | "sms" | "website";

export interface Bot {
  id: string;
  name: string;
  description: string;
  channels: ChannelType[];
  active: boolean;
  // Bot Behavior
  greetingMessage: string;
  aiObjective: string;
  businessInfoItems: BusinessInfoItem[];
  businessHoursEnabled: boolean;
  afterHoursPersonId: string;
  offlineMessage: string;
  handoffEnabled: boolean;
  handoffKeyword: string;
  handoffPersonId: string;
  appointmentBookingEnabled: boolean;
  appointmentCampaignId: string;
  appointmentPersonId: string;
  // Advanced
  escalationRules: EscalationRule[];
  fallbackMessage: string;
  aiModelTier: string;
  aiVoiceStyle: string;
  // Website-widget-only fields
  siteId: string;
  allowedDomains: string[];
  widgetName: string;
  widgetAvatarUrl: string;
  widgetPrimaryColor: string;
  launcherStyle: "icon" | "icon_text";
  widgetPosition: "bottom-right" | "bottom-left";
  widgetSize: "standard" | "compact";
  proactiveTrigger: "off" | "time" | "scroll" | "exit_intent";
  proactiveDelaySeconds: number;
  soundOnNewMessage: boolean;
  mobileBehavior: "floating" | "fullscreen";
}

interface ChatbotTabProps {
  campaigns: Campaign[];
  employees: { id: string; name: string }[];
}

const SEED_BOTS: Bot[] = [
  {
    id: "bot-1",
    name: "WhatsApp & SMS Bot",
    description: "Automated assistant for WhatsApp and SMS customer service.",
    channels: ["whatsapp", "sms"],
    active: true,
    greetingMessage: "Hello! 👋 Welcome to Mantra Health. How can I help you today?",
    aiObjective: "You are a helpful AI assistant for Mantra Health. Your goal is to answer patient questions, help schedule appointments, and provide information about our services. Always be empathetic, concise, and professional. Escalate to a human when the patient asks for one.",
    businessInfoItems: [
      { id: 1, title: "Clinic Hours", information: "Monday–Saturday, 9 AM – 7 PM. Closed on Sundays and public holidays.", active: true },
      { id: 2, title: "Services Offered", information: "General consultation, lab tests, physiotherapy, and specialist referrals.", active: true },
    ],
    businessHoursEnabled: true,
    afterHoursPersonId: "",
    offlineMessage: "We're currently offline. We'll get back to you during business hours (Mon–Sat, 9AM–7PM).",
    handoffEnabled: true,
    handoffKeyword: "human",
    handoffPersonId: "",
    appointmentBookingEnabled: true,
    appointmentCampaignId: "",
    appointmentPersonId: "",
    escalationRules: [
      { id: "esc-1", keyword: "cancel subscription", responsiblePersonId: "2", enabled: true },
      { id: "esc-2", keyword: "complaint", responsiblePersonId: "1", enabled: true },
    ],
    fallbackMessage: "I'm not sure I understood that. Could you rephrase, or would you like to speak with a team member?",
    aiModelTier: "Balanced",
    aiVoiceStyle: "Professional",
    siteId: "site_whatsapp_sms",
    allowedDomains: [],
    widgetName: "WhatsApp Assistant",
    widgetAvatarUrl: "",
    widgetPrimaryColor: "#25D366",
    launcherStyle: "icon",
    widgetPosition: "bottom-right",
    widgetSize: "standard",
    proactiveTrigger: "off",
    proactiveDelaySeconds: 5,
    soundOnNewMessage: true,
    mobileBehavior: "floating",
  },
  {
    id: "bot-2",
    name: "Website Bot",
    description: "AI widget installed on our clinic website.",
    channels: ["website"],
    active: true,
    greetingMessage: "Hi there! Welcome to our website. How can I assist you today?",
    aiObjective: "You are a friendly AI web assistant for Mantra Health clinic. Help visitors browse our website, learn about our clinicians, and book online consultation services.",
    businessInfoItems: [
      { id: 1, title: "Clinic Hours", information: "Monday–Saturday, 9 AM – 7 PM. Closed on Sundays and public holidays.", active: true },
    ],
    businessHoursEnabled: false,
    afterHoursPersonId: "",
    offlineMessage: "Our staff is offline, but feel free to leave a message.",
    handoffEnabled: false,
    handoffKeyword: "help",
    handoffPersonId: "",
    appointmentBookingEnabled: false,
    appointmentCampaignId: "",
    appointmentPersonId: "",
    escalationRules: [],
    fallbackMessage: "I apologize, I didn't catch that. Try asking about hours, services, or appointments.",
    aiModelTier: "Balanced",
    aiVoiceStyle: "Friendly",
    siteId: "site_9f3a2b",
    allowedDomains: ["mantrahealth.com"],
    widgetName: "Mantra Assistant",
    widgetAvatarUrl: "",
    widgetPrimaryColor: "#3B82F6",
    launcherStyle: "icon",
    widgetPosition: "bottom-right",
    widgetSize: "standard",
    proactiveTrigger: "off",
    proactiveDelaySeconds: 5,
    soundOnNewMessage: true,
    mobileBehavior: "floating",
  }
];

const CHANNEL_CLASSES: Record<ChannelType, string> = {
  whatsapp: "bg-green-50 border border-green-200 text-green-700",
  sms: "bg-blue-50 border border-blue-200 text-blue-700",
  website: "bg-purple-50 border border-purple-200 text-purple-700"
};

const CHANNEL_LABELS: Record<ChannelType, string> = {
  whatsapp: "WhatsApp",
  sms: "SMS",
  website: "Website"
};

export default function ChatbotTab({ campaigns, employees }: ChatbotTabProps) {
  const [bots, setBots] = useState<Bot[]>(() => {
    const stored = localStorage.getItem("chatbotBots");
    return stored ? JSON.parse(stored) : SEED_BOTS;
  });
  const [selectedBotId, setSelectedBotId] = useState<string | null>(null);

  // New Bot Form Modal State
  const [showNewBotModal, setShowNewBotModal] = useState(false);
  const [newBotStep, setNewBotStep] = useState(1);
  const [newBotName, setNewBotName] = useState("");
  const [newBotDescription, setNewBotDescription] = useState("");
  const [newBotChannels, setNewBotChannels] = useState<ChannelType[]>([]);
  const [reassignConfirmed, setReassignConfirmed] = useState<Record<string, boolean>>({});
  const [newBotSourceId, setNewBotSourceId] = useState("blank");

  // Bot Editor State
  const [previewMode, setPreviewMode] = useState<"whatsapp" | "website">("whatsapp");
  const [previewDevice, setPreviewDevice] = useState<"desktop" | "mobile">("desktop");
  const [widgetOpen, setWidgetOpen] = useState(true);

  // Behavior Forms Transient State
  const [showBusinessInfoForm, setShowBusinessInfoForm] = useState(false);
  const [businessInfoFormData, setBusinessInfoFormData] = useState({ title: "", information: "", active: true });
  const [editingBusinessInfoId, setEditingBusinessInfoId] = useState<number | null>(null);

  const [showEscalationForm, setShowEscalationForm] = useState(false);
  const [editingEscalationId, setEditingEscalationId] = useState<string | null>(null);
  const [escalationForm, setEscalationForm] = useState({ keyword: "", responsiblePersonId: "" });

  const [newDomainInput, setNewDomainInput] = useState("");

  useEffect(() => {
    localStorage.setItem("chatbotBots", JSON.stringify(bots));
  }, [bots]);

  const selectedBot = bots.find(b => b.id === selectedBotId);

  // Sync default preview mode when selected bot changes
  useEffect(() => {
    if (selectedBot) {
      if (selectedBot.channels.includes("website") && !selectedBot.channels.includes("whatsapp") && !selectedBot.channels.includes("sms")) {
        setPreviewMode("website");
      } else {
        setPreviewMode("whatsapp");
      }
    }
  }, [selectedBotId]);

  const updateSelectedBot = (partial: Partial<Bot>) => {
    if (!selectedBotId) return;
    setBots(prev => prev.map(b => b.id === selectedBotId ? { ...b, ...partial } : b));
  };

  const reassignChannel = (channel: ChannelType, toBotId: string) => {
    setBots(prev => prev.map(b => {
      if (b.id === toBotId) {
        return { ...b, channels: Array.from(new Set([...b.channels, channel])) };
      } else {
        return { ...b, channels: b.channels.filter(c => c !== channel) };
      }
    }));
  };

  // Helper to handle adding a new domain
  const handleAddDomain = () => {
    if (!newDomainInput.trim() || !selectedBot) return;
    const cleanDomain = newDomainInput.trim().toLowerCase().replace(/https?:\/\//, "");
    if (selectedBot.allowedDomains.includes(cleanDomain)) {
      toast.error("Domain already added");
      return;
    }
    updateSelectedBot({ allowedDomains: [...selectedBot.allowedDomains, cleanDomain] });
    setNewDomainInput("");
    toast.success("Domain added");
  };

  // Helper to remove a domain
  const handleRemoveDomain = (domain: string) => {
    if (!selectedBot) return;
    updateSelectedBot({ allowedDomains: selectedBot.allowedDomains.filter(d => d !== domain) });
    toast.success("Domain removed");
  };

  const handleCreateBot = () => {
    if (!newBotName.trim()) {
      toast.error("Bot Name is required");
      return;
    }

    const newId = `bot_${Date.now()}`;
    const siteId = `site_${Math.random().toString(36).substring(2, 8)}`;

    // Create a baseline bot object
    let newBot: Bot = {
      id: newId,
      name: newBotName,
      description: newBotDescription || "No description provided.",
      channels: newBotChannels,
      active: true,
      greetingMessage: "Hello! How can I help you today?",
      aiObjective: "You are a helpful customer assistant. Answer questions clearly and politely.",
      businessInfoItems: [],
      businessHoursEnabled: false,
      afterHoursPersonId: "",
      offlineMessage: "We are currently offline. We will reply during business hours.",
      handoffEnabled: false,
      handoffKeyword: "human",
      handoffPersonId: "",
      appointmentBookingEnabled: false,
      appointmentCampaignId: "",
      appointmentPersonId: "",
      escalationRules: [],
      fallbackMessage: "I'm sorry, I didn't quite get that. Could you please rephrase?",
      aiModelTier: "Balanced",
      aiVoiceStyle: "Professional",
      siteId,
      allowedDomains: [],
      widgetName: newBotName,
      widgetAvatarUrl: "",
      widgetPrimaryColor: "#3B82F6",
      launcherStyle: "icon",
      widgetPosition: "bottom-right",
      widgetSize: "standard",
      proactiveTrigger: "off",
      proactiveDelaySeconds: 5,
      soundOnNewMessage: true,
      mobileBehavior: "floating",
    };

    // Apply template properties if cloned
    if (newBotSourceId !== "blank") {
      const sourceBot = bots.find(b => b.id === newBotSourceId);
      if (sourceBot) {
        newBot = {
          ...newBot,
          greetingMessage: sourceBot.greetingMessage,
          aiObjective: sourceBot.aiObjective,
          businessInfoItems: sourceBot.businessInfoItems.map(item => ({ ...item })),
          businessHoursEnabled: sourceBot.businessHoursEnabled,
          afterHoursPersonId: sourceBot.afterHoursPersonId,
          offlineMessage: sourceBot.offlineMessage,
          handoffEnabled: sourceBot.handoffEnabled,
          handoffKeyword: sourceBot.handoffKeyword,
          handoffPersonId: sourceBot.handoffPersonId,
          appointmentBookingEnabled: sourceBot.appointmentBookingEnabled,
          appointmentCampaignId: sourceBot.appointmentCampaignId,
          appointmentPersonId: sourceBot.appointmentPersonId,
          escalationRules: sourceBot.escalationRules.map(rule => ({ ...rule })),
          fallbackMessage: sourceBot.fallbackMessage,
          aiModelTier: sourceBot.aiModelTier,
          aiVoiceStyle: sourceBot.aiVoiceStyle,
          widgetName: sourceBot.widgetName,
          widgetPrimaryColor: sourceBot.widgetPrimaryColor,
          launcherStyle: sourceBot.launcherStyle,
          widgetPosition: sourceBot.widgetPosition,
          widgetSize: sourceBot.widgetSize,
          proactiveTrigger: sourceBot.proactiveTrigger,
          proactiveDelaySeconds: sourceBot.proactiveDelaySeconds,
          soundOnNewMessage: sourceBot.soundOnNewMessage,
          mobileBehavior: sourceBot.mobileBehavior,
        };
      }
    }

    // Process reassignments
    setBots(prev => {
      // Remove chosen channels from other bots
      const cleanedBots = prev.map(b => ({
        ...b,
        channels: b.channels.filter(c => !newBotChannels.includes(c))
      }));
      return [...cleanedBots, newBot];
    });

    toast.success("Bot created successfully");
    setShowNewBotModal(false);
    // Reset modal fields
    setNewBotName("");
    setNewBotDescription("");
    setNewBotChannels([]);
    setReassignConfirmed({});
    setNewBotSourceId("blank");
    setNewBotStep(1);

    // Navigate directly to Level 2 for this new bot
    setSelectedBotId(newId);
  };

  const handleSaveEscalation = () => {
    if (!selectedBot) return;
    if (!escalationForm.keyword.trim() || !escalationForm.responsiblePersonId) {
      toast.error("Keyword and responsible person are required");
      return;
    }
    if (editingEscalationId) {
      updateSelectedBot({
        escalationRules: selectedBot.escalationRules.map(r =>
          r.id === editingEscalationId ? { ...r, ...escalationForm } : r
        )
      });
      toast.success("Rule updated");
    } else {
      updateSelectedBot({
        escalationRules: [
          ...selectedBot.escalationRules,
          { id: `esc-${Date.now()}`, ...escalationForm, enabled: true }
        ]
      });
      toast.success("Rule added");
    }
    setShowEscalationForm(false);
    setEditingEscalationId(null);
    setEscalationForm({ keyword: "", responsiblePersonId: "" });
  };

  // Check if any selected channel in step 2 is already claimed
  const getOccupyingBot = (ch: ChannelType) => {
    return bots.find(b => b.channels.includes(ch));
  };

  // LEVEL 2 - Bot Editor view
  if (selectedBotId && selectedBot) {
    const hasWebsite = selectedBot.channels.includes("website");
    const hasMessaging = selectedBot.channels.includes("whatsapp") || selectedBot.channels.includes("sms");

    // Status compute for website widget
    const isLive = selectedBot.active && selectedBot.allowedDomains.length > 0;
    const hasDomainsNotActive = !selectedBot.active && selectedBot.allowedDomains.length > 0;
    const widgetStatusText = isLive 
      ? "Installed & live" 
      : hasDomainsNotActive 
        ? "Installed but inactive" 
        : "Not yet installed";
    const widgetStatusColor = isLive 
      ? "bg-green-100 text-green-700 border-green-200" 
      : hasDomainsNotActive 
        ? "bg-yellow-100 text-yellow-700 border-yellow-200" 
        : "bg-gray-100 text-gray-500 border-gray-200";

    return (
      <div className="space-y-6">
        {/* Editor Header / Breadcrumbs */}
        <div className="flex items-center justify-between bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <button 
              type="button"
              onClick={() => setSelectedBotId(null)}
              className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-500 transition-colors"
              title="Back to list"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <div className="flex items-center gap-2">
              <span className="text-gray-400 text-sm" style={{ fontFamily: "Outfit, sans-serif" }}>Chatbot</span>
              <span className="text-gray-300 text-xs">/</span>
              <h1 className="text-base font-bold text-gray-900" style={{ fontFamily: "DM Sans, sans-serif" }}>
                {selectedBot.name}
              </h1>
            </div>

            {/* Channels Chip Editor next to bot name */}
            <span className="text-gray-300 text-xs">|</span>
            <div className="flex items-center gap-1.5">
              {(["whatsapp", "sms", "website"] as const).map(ch => {
                const isAssigned = selectedBot.channels.includes(ch);
                const occupyingBot = bots.find(b => b.id !== selectedBot.id && b.channels.includes(ch));

                const handleToggleChannel = () => {
                  if (isAssigned) {
                    updateSelectedBot({ channels: selectedBot.channels.filter(c => c !== ch) });
                    toast.success(`${CHANNEL_LABELS[ch]} channel unassigned`);
                  } else {
                    if (occupyingBot) {
                      const confirm = window.confirm(
                        `"${CHANNEL_LABELS[ch]}" is currently assigned to "${occupyingBot.name}". Assigning it here will remove it from "${occupyingBot.name}". Continue?`
                      );
                      if (confirm) {
                        reassignChannel(ch, selectedBot.id);
                        toast.success(`Reassigned ${CHANNEL_LABELS[ch]} to this bot`);
                      }
                    } else {
                      updateSelectedBot({ channels: [...selectedBot.channels, ch] });
                      toast.success(`Assigned ${CHANNEL_LABELS[ch]} to this bot`);
                    }
                  }
                };

                return (
                  <button
                    key={ch}
                    type="button"
                    onClick={handleToggleChannel}
                    className={`px-2 py-0.5 rounded-full text-xs font-semibold border transition-all ${
                      isAssigned
                        ? CHANNEL_CLASSES[ch]
                        : "bg-white border-gray-200 text-gray-400 hover:bg-gray-50"
                    }`}
                  >
                    {isAssigned ? "✓ " : ""}{CHANNEL_LABELS[ch]}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-500 font-semibold uppercase tracking-wider" style={{ fontFamily: "Outfit, sans-serif" }}>Active Status</span>
            <label className="relative inline-flex items-center cursor-pointer">
              <input 
                type="checkbox" 
                className="sr-only peer" 
                checked={selectedBot.active}
                onChange={e => {
                  updateSelectedBot({ active: e.target.checked });
                  toast.success(e.target.checked ? "Bot enabled" : "Bot disabled");
                }} 
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-500" />
            </label>
          </div>
        </div>

        {/* 2-Column layout */}
        <div className="flex gap-6 items-start">
          {/* Left Column - Live Preview */}
          <div className="w-[320px] shrink-0 space-y-4">
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 space-y-4">
              <div className="flex items-center justify-between border-b border-gray-100 pb-2">
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Live Preview</span>
                
                {/* Size toggle for browser mockup */}
                {previewMode === "website" && (
                  <div className="flex rounded-lg border border-gray-200 p-0.5 bg-gray-50">
                    <button
                      type="button"
                      onClick={() => setPreviewDevice("desktop")}
                      className={`p-1 rounded-md transition-colors ${previewDevice === "desktop" ? "bg-white text-blue-600 shadow-sm" : "text-gray-400 hover:text-gray-600"}`}
                    >
                      <Laptop className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setPreviewDevice("mobile")}
                      className={`p-1 rounded-md transition-colors ${previewDevice === "mobile" ? "bg-white text-blue-600 shadow-sm" : "text-gray-400 hover:text-gray-600"}`}
                    >
                      <Smartphone className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
              </div>

              {/* Segmented view switcher if bot has BOTH widget and text channels */}
              {hasWebsite && hasMessaging && (
                <div className="flex rounded-xl border border-gray-200 p-1 bg-gray-100 gap-1 select-none">
                  <button
                    type="button"
                    onClick={() => setPreviewMode("whatsapp")}
                    className={`flex-1 text-center py-1 text-xs font-semibold rounded-lg transition-colors ${previewMode === "whatsapp" ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-800"}`}
                  >
                    WhatsApp View
                  </button>
                  <button
                    type="button"
                    onClick={() => setPreviewMode("website")}
                    className={`flex-1 text-center py-1 text-xs font-semibold rounded-lg transition-colors ${previewMode === "website" ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-800"}`}
                  >
                    Website View
                  </button>
                </div>
              )}

              {/* WhatsApp Mockup Preview */}
              {previewMode === "whatsapp" && (
                <div className="rounded-xl border-2 border-gray-800 overflow-hidden bg-[#E5DDD5] h-[340px] flex flex-col relative">
                  <div className="bg-[#075E54] text-white px-3 py-2 flex items-center gap-2 flex-shrink-0">
                    <div className="w-7 h-7 rounded-full bg-white/20 flex items-center justify-center font-bold text-[10px]">
                      {selectedBot.name.substring(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <p className="text-xs font-bold leading-none">{selectedBot.name}</p>
                      <p className="text-[9px] opacity-75 mt-0.5">{selectedBot.active ? "● Online" : "○ Offline"}</p>
                    </div>
                  </div>
                  <div className="flex-1 p-3 space-y-2 overflow-y-auto">
                    <div className="flex justify-start">
                      <div className="bg-white rounded-lg rounded-tl-none shadow-sm px-2.5 py-1.5 max-w-[85%]">
                        <p className="text-[10px] text-gray-800 leading-snug">{selectedBot.greetingMessage || "Hello! How can I help?"}</p>
                        <p className="text-[8px] text-gray-400 mt-0.5 text-right">10:00 AM</p>
                      </div>
                    </div>
                    <div className="flex justify-end">
                      <div className="bg-[#DCF8C6] rounded-lg rounded-tr-none shadow-sm px-2.5 py-1.5 max-w-[80%] select-none">
                        <p className="text-[10px] text-gray-800 leading-snug">I need assistance</p>
                        <p className="text-[8px] text-gray-400 mt-0.5 text-right">10:01 AM ✓✓</p>
                      </div>
                    </div>
                  </div>
                  <div className="bg-white px-2.5 py-1.5 flex items-center gap-1.5 border-t border-gray-200 flex-shrink-0 select-none">
                    <div className="flex-1 bg-gray-100 rounded-full px-2.5 py-1 text-[9px] text-gray-400">Type a message...</div>
                    <div className="w-6 h-6 bg-[#075E54] rounded-full flex items-center justify-center"><MessageCircle className="w-3 h-3 text-white" /></div>
                  </div>
                </div>
              )}

              {/* Website Mockup Preview */}
              {previewMode === "website" && (
                <div 
                  className={`border border-gray-200 rounded-xl overflow-hidden shadow-inner bg-gray-100 flex flex-col relative transition-all duration-300 ${
                    previewDevice === "mobile" ? "mx-auto w-[240px] h-[360px]" : "w-full h-[320px]"
                  }`}
                >
                  {/* Browser Bar */}
                  <div className="bg-white px-2.5 py-1.5 border-b border-gray-200 flex items-center gap-2 select-none flex-shrink-0">
                    <div className="flex gap-1">
                      <span className="w-2 h-2 rounded-full bg-red-400 inline-block" />
                      <span className="w-2 h-2 rounded-full bg-yellow-400 inline-block" />
                      <span className="w-2 h-2 rounded-full bg-green-400 inline-block" />
                    </div>
                    <div className="flex-1 bg-gray-100 rounded-md py-0.5 text-[9px] text-gray-400 text-center truncate px-2 font-mono">
                      https://{selectedBot.allowedDomains[0] || "my-website.com"}
                    </div>
                  </div>

                  {/* Website Body Content */}
                  <div className="flex-1 p-3 flex flex-col items-center justify-center text-center bg-white relative overflow-hidden">
                    <h3 className="text-xs font-bold text-gray-800 mb-1" style={{ fontFamily: "DM Sans, sans-serif" }}>Mantra Health Clinic</h3>
                    <p className="text-[9px] text-gray-400 max-w-[150px] leading-relaxed" style={{ fontFamily: "Outfit, sans-serif" }}>
                      Experience virtual-first clinical care at your fingertips.
                    </p>

                    {/* Chat Widget Window */}
                    {widgetOpen && (
                      <div 
                        className={`absolute z-20 bg-white border border-gray-200 rounded-lg shadow-xl overflow-hidden flex flex-col transition-all duration-300 ${
                          selectedBot.widgetPosition === "bottom-left" ? "left-2" : "right-2"
                        } ${selectedBot.widgetSize === "compact" ? "bottom-12 w-[180px] h-[190px]" : "bottom-12 w-[200px] h-[230px]"}`}
                      >
                        {/* Widget Header */}
                        <div 
                          className="text-white p-2 flex items-center gap-1.5 flex-shrink-0"
                          style={{ backgroundColor: selectedBot.widgetPrimaryColor }}
                        >
                          {selectedBot.widgetAvatarUrl ? (
                            <img 
                              src={selectedBot.widgetAvatarUrl} 
                              alt="Avatar" 
                              className="w-5 h-5 rounded-full object-cover bg-white" 
                            />
                          ) : (
                            <div className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center">
                              <Bot className="w-3 h-3 text-white" />
                            </div>
                          )}
                          <div className="min-w-0 flex-1">
                            <p className="text-[10px] font-bold leading-none truncate">{selectedBot.widgetName || "Assistant"}</p>
                            <p className="text-[8px] opacity-75 mt-0.5">Automated Bot</p>
                          </div>
                          <button 
                            type="button" 
                            onClick={(e) => { e.stopPropagation(); setWidgetOpen(false); }}
                            className="hover:bg-white/20 rounded p-0.5"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        {/* Widget Messages */}
                        <div className="flex-1 p-2 space-y-1.5 overflow-y-auto bg-gray-50">
                          <div className="flex justify-start">
                            <div className="bg-white border border-gray-100 rounded-lg rounded-tl-none px-2 py-1 shadow-sm max-w-[90%]">
                              <p className="text-[9px] text-gray-800 leading-snug">{selectedBot.greetingMessage}</p>
                            </div>
                          </div>
                        </div>

                        {/* Widget Input */}
                        <div className="bg-white border-t border-gray-100 px-2 py-1 flex items-center gap-1 flex-shrink-0 select-none">
                          <div className="flex-1 bg-gray-100 rounded-full px-2 py-0.5 text-[8px] text-gray-400">Type a message...</div>
                        </div>
                      </div>
                    )}

                    {/* Floating Launcher Bubble */}
                    <button
                      type="button"
                      onClick={() => setWidgetOpen(!widgetOpen)}
                      className={`absolute z-10 p-2.5 rounded-full shadow-lg text-white transition-all hover:scale-105 active:scale-95 flex items-center gap-1.5 ${
                        selectedBot.widgetPosition === "bottom-left" ? "bottom-2 left-2" : "bottom-2 right-2"
                      }`}
                      style={{ backgroundColor: selectedBot.widgetPrimaryColor }}
                    >
                      <MessageCircle className="w-4 h-4" />
                      {selectedBot.launcherStyle === "icon_text" && (
                        <span className="text-[9px] font-bold pr-0.5">Chat</span>
                      )}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Right Column - Accordion Config Sections */}
          <div className="flex-1 space-y-3">
            
            {/* Group 1: Install & Status (ONLY renders if WEBSITE is in channels) */}
            {hasWebsite && (
              <div className="space-y-3">
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5 px-1" style={{ fontFamily: "Outfit, sans-serif" }}>Install & Status</p>
                
                <AccordionSection
                  title="Installation & Embed"
                  icon={<Globe className="w-5 h-5 text-purple-600" />}
                  iconBg="bg-purple-100"
                  defaultOpen={true}
                  badge={widgetStatusText}
                  badgeColor={widgetStatusColor}
                >
                  <p className="text-xs text-gray-500 leading-relaxed" style={{ fontFamily: "Outfit, sans-serif" }}>
                    Copy this code snippet and paste it right before the close of your site's <code className="font-mono text-gray-700 bg-gray-100 px-1 py-0.5 rounded text-[11px]">&lt;/body&gt;</code> tag to embed this widget.
                  </p>
                  
                  {/* Code snippet block */}
                  <div className="relative rounded-lg bg-gray-900 text-gray-100 p-3.5 font-mono text-xs overflow-x-auto flex items-center justify-between gap-4">
                    <span className="whitespace-nowrap select-all text-blue-300">
                      {`<script src="https://app.example.com/widget.js" data-site-id="${selectedBot.siteId}" defer></script>`}
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard.writeText(`<script src="https://app.example.com/widget.js" data-site-id="${selectedBot.siteId}" defer></script>`);
                        toast.success("Snippet copied to clipboard");
                      }}
                      className="p-1.5 hover:bg-gray-800 text-gray-400 hover:text-white rounded-md shrink-0 transition-colors"
                      title="Copy code"
                    >
                      <Copy className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Allowed Domains Chip Editor */}
                  <div className="space-y-2 pt-2 border-t border-gray-100">
                    <label className="block text-xs font-semibold text-gray-700" style={{ fontFamily: "DM Sans, sans-serif" }}>Allowed Domains</label>
                    <p className="text-[11px] text-gray-400" style={{ fontFamily: "Outfit, sans-serif" }}>Security check: Only allow widget load on these domains.</p>
                    
                    {/* Chip List */}
                    <div className="flex flex-wrap gap-1.5 mb-2">
                      {selectedBot.allowedDomains.length === 0 ? (
                        <span className="text-xs text-gray-400 italic">No domains configured</span>
                      ) : (
                        selectedBot.allowedDomains.map(dom => (
                          <span 
                            key={dom}
                            className="inline-flex items-center gap-1 bg-gray-100 border border-gray-200 rounded-md px-2 py-0.5 text-xs text-gray-700"
                          >
                            <span>{dom}</span>
                            <button 
                              type="button" 
                              onClick={() => handleRemoveDomain(dom)}
                              className="text-gray-400 hover:text-red-500 rounded p-0.5"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </span>
                        ))
                      )}
                    </div>

                    <div className="flex gap-2">
                      <input 
                        type="text" 
                        value={newDomainInput} 
                        onChange={e => setNewDomainInput(e.target.value)} 
                        placeholder="e.g. mantrahealth.com" 
                        onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); handleAddDomain(); } }}
                        className="flex-1 px-3 py-1.5 border border-gray-200 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-blue-500" 
                      />
                      <Button variant="outline" size="sm" onClick={handleAddDomain}>Add</Button>
                    </div>
                  </div>

                  {/* Installer Buttons */}
                  <div className="flex gap-2.5 pt-3 border-t border-gray-100">
                    <Button 
                      variant="outline" 
                      className="flex-1 text-xs py-2" 
                      onClick={() => toast.success("Instructions sent to developer team.")}
                    >
                      Send install instructions
                    </Button>
                    <Button 
                      variant="outline" 
                      className="flex-1 text-xs py-2" 
                      onClick={() => {
                        if (selectedBot.allowedDomains.length === 0) {
                          toast.error("Add an allowed domain first");
                        } else {
                          toast.success(`Opening sandbox preview page for https://${selectedBot.allowedDomains[0]}`);
                        }
                      }}
                    >
                      Open test page
                    </Button>
                  </div>
                </AccordionSection>
              </div>
            )}

            {/* Group 2: Appearance & Behavior (ONLY renders if WEBSITE is in channels) */}
            {hasWebsite && (
              <div className="space-y-3">
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5 px-1" style={{ fontFamily: "Outfit, sans-serif" }}>Appearance & Customization</p>
                
                <AccordionSection
                  title="Widget Theme & Settings"
                  icon={<Settings2 className="w-5 h-5 text-blue-600" />}
                  iconBg="bg-blue-100"
                  defaultOpen={false}
                >
                  <div className="grid grid-cols-2 gap-4">
                    {/* Widget Display Name */}
                    <div>
                      <label className="block text-xs font-semibold mb-1" style={{ fontFamily: "DM Sans, sans-serif" }}>Display Name</label>
                      <input 
                        type="text" 
                        value={selectedBot.widgetName}
                        onChange={e => updateSelectedBot({ widgetName: e.target.value })}
                        className="w-full px-3 py-1.5 border border-gray-200 rounded-lg text-xs bg-white focus:outline-none" 
                      />
                    </div>
                    {/* Widget Avatar */}
                    <div>
                      <label className="block text-xs font-semibold mb-1" style={{ fontFamily: "DM Sans, sans-serif" }}>Avatar URL</label>
                      <input 
                        type="text" 
                        value={selectedBot.widgetAvatarUrl}
                        onChange={e => updateSelectedBot({ widgetAvatarUrl: e.target.value })}
                        placeholder="https://example.com/avatar.png"
                        className="w-full px-3 py-1.5 border border-gray-200 rounded-lg text-xs bg-white focus:outline-none" 
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    {/* Primary Color theme selection */}
                    <div>
                      <label className="block text-xs font-semibold mb-1" style={{ fontFamily: "DM Sans, sans-serif" }}>Primary Theme Color</label>
                      <div className="flex items-center gap-2">
                        <input 
                          type="color" 
                          value={selectedBot.widgetPrimaryColor}
                          onChange={e => updateSelectedBot({ widgetPrimaryColor: e.target.value })}
                          className="w-7 h-7 rounded border border-gray-200 cursor-pointer p-0 shrink-0" 
                        />
                        <input 
                          type="text" 
                          value={selectedBot.widgetPrimaryColor}
                          onChange={e => updateSelectedBot({ widgetPrimaryColor: e.target.value })}
                          className="w-full px-2 py-1 border border-gray-200 rounded-lg text-xs font-mono bg-white focus:outline-none uppercase" 
                        />
                      </div>
                    </div>
                    
                    {/* Launcher Style Toggle */}
                    <div>
                      <label className="block text-xs font-semibold mb-1" style={{ fontFamily: "DM Sans, sans-serif" }}>Launcher Bubble Style</label>
                      <div className="flex border border-gray-200 rounded-lg overflow-hidden bg-gray-50 text-[11px] p-0.5">
                        <button
                          type="button"
                          onClick={() => updateSelectedBot({ launcherStyle: "icon" })}
                          className={`flex-1 text-center py-1 rounded-md font-medium ${selectedBot.launcherStyle === "icon" ? "bg-white text-blue-600 shadow-sm" : "text-gray-500 hover:text-gray-700"}`}
                        >
                          Icon only
                        </button>
                        <button
                          type="button"
                          onClick={() => updateSelectedBot({ launcherStyle: "icon_text" })}
                          className={`flex-1 text-center py-1 rounded-md font-medium ${selectedBot.launcherStyle === "icon_text" ? "bg-white text-blue-600 shadow-sm" : "text-gray-500 hover:text-gray-700"}`}
                        >
                          Icon + Text
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    {/* Widget Position */}
                    <div>
                      <label className="block text-xs font-semibold mb-1" style={{ fontFamily: "DM Sans, sans-serif" }}>Placement Position</label>
                      <div className="flex border border-gray-200 rounded-lg overflow-hidden bg-gray-50 text-[11px] p-0.5">
                        <button
                          type="button"
                          onClick={() => updateSelectedBot({ widgetPosition: "bottom-right" })}
                          className={`flex-1 text-center py-1 rounded-md font-medium ${selectedBot.widgetPosition === "bottom-right" ? "bg-white text-blue-600 shadow-sm" : "text-gray-500 hover:text-gray-700"}`}
                        >
                          Bottom-Right
                        </button>
                        <button
                          type="button"
                          onClick={() => updateSelectedBot({ widgetPosition: "bottom-left" })}
                          className={`flex-1 text-center py-1 rounded-md font-medium ${selectedBot.widgetPosition === "bottom-left" ? "bg-white text-blue-600 shadow-sm" : "text-gray-500 hover:text-gray-700"}`}
                        >
                          Bottom-Left
                        </button>
                      </div>
                    </div>
                    
                    {/* Widget size selection */}
                    <div>
                      <label className="block text-xs font-semibold mb-1" style={{ fontFamily: "DM Sans, sans-serif" }}>Window Size</label>
                      <div className="flex border border-gray-200 rounded-lg overflow-hidden bg-gray-50 text-[11px] p-0.5">
                        <button
                          type="button"
                          onClick={() => updateSelectedBot({ widgetSize: "standard" })}
                          className={`flex-1 text-center py-1 rounded-md font-medium ${selectedBot.widgetSize === "standard" ? "bg-white text-blue-600 shadow-sm" : "text-gray-500 hover:text-gray-700"}`}
                        >
                          Standard
                        </button>
                        <button
                          type="button"
                          onClick={() => updateSelectedBot({ widgetSize: "compact" })}
                          className={`flex-1 text-center py-1 rounded-md font-medium ${selectedBot.widgetSize === "compact" ? "bg-white text-blue-600 shadow-sm" : "text-gray-500 hover:text-gray-700"}`}
                        >
                          Compact
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    {/* Proactive Triggers select */}
                    <div>
                      <label className="block text-xs font-semibold mb-1" style={{ fontFamily: "DM Sans, sans-serif" }}>Proactive Pop-up</label>
                      <Select 
                        value={selectedBot.proactiveTrigger}
                        onValueChange={(val: any) => updateSelectedBot({ proactiveTrigger: val })}
                      >
                        <SelectTrigger className="w-full h-8 text-xs"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="off">Disabled</SelectItem>
                          <SelectItem value="time">Time delay on page</SelectItem>
                          <SelectItem value="scroll">Scroll percentage</SelectItem>
                          <SelectItem value="exit_intent">Exit intent detected</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Delay Seconds for Trigger */}
                    {selectedBot.proactiveTrigger !== "off" && (
                      <div>
                        <label className="block text-xs font-semibold mb-1" style={{ fontFamily: "DM Sans, sans-serif" }}>Delay (seconds)</label>
                        <input 
                          type="number" 
                          min={1} 
                          max={300}
                          value={selectedBot.proactiveDelaySeconds}
                          onChange={e => updateSelectedBot({ proactiveDelaySeconds: parseInt(e.target.value) || 5 })}
                          className="w-full px-3 py-1.5 border border-gray-200 rounded-lg text-xs bg-white focus:outline-none" 
                        />
                      </div>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-4 pt-1">
                    {/* Sound Alert check */}
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium text-gray-700 font-semibold" style={{ fontFamily: "DM Sans, sans-serif" }}>Play sound alert</span>
                      <label className="relative inline-flex items-center cursor-pointer font-normal">
                        <input 
                          type="checkbox" 
                          className="sr-only peer" 
                          checked={selectedBot.soundOnNewMessage}
                          onChange={e => updateSelectedBot({ soundOnNewMessage: e.target.checked })} 
                        />
                        <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600" />
                      </label>
                    </div>

                    {/* Mobile widget appearance selection */}
                    <div>
                      <label className="block text-xs font-semibold mb-1" style={{ fontFamily: "DM Sans, sans-serif" }}>Mobile Screen Layout</label>
                      <div className="flex border border-gray-200 rounded-lg overflow-hidden bg-gray-50 text-[11px] p-0.5">
                        <button
                          type="button"
                          onClick={() => updateSelectedBot({ mobileBehavior: "floating" })}
                          className={`flex-1 text-center py-1 rounded-md font-medium ${selectedBot.mobileBehavior === "floating" ? "bg-white text-blue-600 shadow-sm" : "text-gray-500 hover:text-gray-700"}`}
                        >
                          Floating
                        </button>
                        <button
                          type="button"
                          onClick={() => updateSelectedBot({ mobileBehavior: "fullscreen" })}
                          className={`flex-1 text-center py-1 rounded-md font-medium ${selectedBot.mobileBehavior === "fullscreen" ? "bg-white text-blue-600 shadow-sm" : "text-gray-500 hover:text-gray-700"}`}
                        >
                          Full Screen
                        </button>
                      </div>
                    </div>
                  </div>
                </AccordionSection>
              </div>
            )}

            {/* Group 3: Bot Behavior (always rendered) */}
            <div className="space-y-3">
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5 px-1" style={{ fontFamily: "Outfit, sans-serif" }}>Bot Behavior</p>

              {/* 1. Greeting Message */}
              <AccordionSection
                title="Greeting Message"
                icon={<MessageCircle className="w-5 h-5 text-blue-600" />}
                iconBg="bg-blue-100"
                defaultOpen={!hasWebsite}
              >
                <p className="text-xs text-gray-500" style={{ fontFamily: "Outfit, sans-serif" }}>
                  Sent automatically when a contact opens a new conversation thread.
                </p>
                <textarea 
                  rows={3} 
                  value={selectedBot.greetingMessage} 
                  onChange={e => updateSelectedBot({ greetingMessage: e.target.value })}
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none bg-white font-medium"
                  style={{ fontFamily: "Outfit, sans-serif" }} 
                />
              </AccordionSection>

              {/* 2. AI Objective */}
              <AccordionSection
                title="AI Objective & Behaviour"
                icon={<Bot className="w-5 h-5 text-purple-600" />}
                iconBg="bg-purple-100"
                defaultOpen={false}
              >
                <p className="text-xs text-gray-500" style={{ fontFamily: "Outfit, sans-serif" }}>
                  Define the bot's system instructions, boundaries, Tone of Voice, and overall behavior goal.
                </p>
                <textarea 
                  rows={6} 
                  value={selectedBot.aiObjective} 
                  onChange={e => updateSelectedBot({ aiObjective: e.target.value })}
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-y bg-white"
                  style={{ fontFamily: "Outfit, sans-serif" }} 
                />
              </AccordionSection>

              {/* 3. Business Information */}
              <AccordionSection
                title="Business Information"
                icon={<Info className="w-5 h-5 text-teal-600" />}
                iconBg="bg-teal-100"
                defaultOpen={false}
                badge={`${selectedBot.businessInfoItems.filter(i => i.active).length} items`}
                badgeColor="bg-teal-100 text-teal-700"
              >
                <p className="text-xs text-gray-500" style={{ fontFamily: "Outfit, sans-serif" }}>
                  Context blocks: Add static facts about clinic hours, pricing, policies, or FAQs that the AI can cite.
                </p>
                <div className="space-y-2">
                  {selectedBot.businessInfoItems.map(item => (
                    <div key={item.id} className={`p-3 border rounded-lg bg-white flex justify-between items-start ${item.active ? "border-gray-200" : "border-gray-100 opacity-60"}`}>
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-bold text-gray-800" style={{ fontFamily: "DM Sans, sans-serif" }}>{item.title}</p>
                        <p className="text-xs text-gray-500 mt-1 line-clamp-2" style={{ fontFamily: "Outfit, sans-serif" }}>{item.information}</p>
                      </div>
                      <div className="flex gap-1 ml-2 shrink-0">
                        <button 
                          type="button" 
                          onClick={() => {
                            setEditingBusinessInfoId(item.id);
                            setBusinessInfoFormData({ title: item.title, information: item.information, active: item.active });
                            setShowBusinessInfoForm(true);
                          }} 
                          className="p-1 hover:bg-gray-100 rounded"
                        >
                          <Pencil className="w-3.5 h-3.5 text-gray-500" />
                        </button>
                        <button 
                          type="button" 
                          onClick={() => {
                            updateSelectedBot({
                              businessInfoItems: selectedBot.businessInfoItems.filter(i => i.id !== item.id)
                            });
                            toast.success("Information deleted");
                          }} 
                          className="p-1 hover:bg-red-50 rounded"
                        >
                          <Trash2 className="w-3.5 h-3.5 text-red-500" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                {showBusinessInfoForm && (
                  <div className="p-4 border border-blue-200 bg-blue-50/40 rounded-lg space-y-3">
                    <h4 className="text-sm font-bold text-gray-800" style={{ fontFamily: "DM Sans, sans-serif" }}>
                      {editingBusinessInfoId ? "Edit Context Block" : "Add Context Block"}
                    </h4>
                    <div>
                      <label className="block text-xs font-semibold text-gray-600 mb-1">Title</label>
                      <input 
                        type="text" 
                        value={businessInfoFormData.title} 
                        onChange={e => setBusinessInfoFormData(p => ({ ...p, title: e.target.value }))} 
                        placeholder="Clinic Address"
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none" 
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-600 mb-1">Information</label>
                      <textarea 
                        rows={2} 
                        value={businessInfoFormData.information} 
                        onChange={e => setBusinessInfoFormData(p => ({ ...p, information: e.target.value }))} 
                        placeholder="Monday to Saturday, 9 AM – 7 PM."
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white resize-none focus:outline-none" 
                        style={{ fontFamily: "Outfit, sans-serif" }} 
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <label className="flex items-center gap-2 cursor-pointer font-normal">
                        <input 
                          type="checkbox" 
                          checked={businessInfoFormData.active} 
                          onChange={e => setBusinessInfoFormData(p => ({ ...p, active: e.target.checked }))}
                          className="w-4 h-4 rounded text-blue-600 border-gray-300" 
                        />
                        <span className="text-xs font-medium text-gray-700">Active</span>
                      </label>
                      <div className="flex gap-2">
                        <button 
                          type="button" 
                          onClick={() => {
                            setShowBusinessInfoForm(false);
                            setEditingBusinessInfoId(null);
                            setBusinessInfoFormData({ title: "", information: "", active: true });
                          }}
                          className="px-3 py-1.5 text-xs border border-gray-300 rounded-lg text-gray-600 hover:bg-gray-50"
                        >
                          Cancel
                        </button>
                        <button 
                          type="button" 
                          onClick={() => {
                            if (!businessInfoFormData.title || !businessInfoFormData.information) return;
                            if (editingBusinessInfoId !== null) {
                              updateSelectedBot({
                                businessInfoItems: selectedBot.businessInfoItems.map(i =>
                                  i.id === editingBusinessInfoId ? { ...i, ...businessInfoFormData } : i
                                )
                              });
                              toast.success("Updated");
                            } else {
                              updateSelectedBot({
                                businessInfoItems: [...selectedBot.businessInfoItems, { id: Date.now(), ...businessInfoFormData }]
                              });
                              toast.success("Added");
                            }
                            setShowBusinessInfoForm(false);
                            setEditingBusinessInfoId(null);
                            setBusinessInfoFormData({ title: "", information: "", active: true });
                          }} 
                          className="px-3 py-1.5 text-xs bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                        >
                          Save
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {!showBusinessInfoForm && (
                  <button 
                    type="button" 
                    onClick={() => setShowBusinessInfoForm(true)}
                    className="w-full py-2 border-2 border-dashed border-gray-300 rounded-lg text-xs font-semibold text-blue-600 hover:border-blue-400 hover:bg-blue-50/30 transition-colors flex items-center justify-center gap-1.5"
                  >
                    <Plus className="w-3.5 h-3.5" /> Add Information
                  </button>
                )}
              </AccordionSection>

              {/* 4. Business Hours */}
              <AccordionSection
                title="Business Hours"
                icon={<Clock className="w-5 h-5 text-amber-600" />}
                iconBg="bg-amber-100"
                defaultOpen={false}
                badge={selectedBot.businessHoursEnabled ? "On" : "Off"}
                badgeColor={selectedBot.businessHoursEnabled ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-800" style={{ fontFamily: "Outfit, sans-serif" }}>Restrict chatbot replies to business hours</span>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input 
                      type="checkbox" 
                      className="sr-only peer" 
                      checked={selectedBot.businessHoursEnabled} 
                      onChange={e => updateSelectedBot({ businessHoursEnabled: e.target.checked })} 
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600" />
                  </label>
                </div>
                {selectedBot.businessHoursEnabled && (
                  <div className="space-y-3 pt-2">
                    <div className="p-3 rounded-lg bg-amber-50 border border-amber-100">
                      <p className="text-xs text-amber-800 font-medium" style={{ fontFamily: "Outfit, sans-serif" }}>
                        Mon–Sat, 9 AM – 7 PM · Configure hours in Settings → Business Hours
                      </p>
                    </div>
                    <div>
                      <label className="block text-xs font-bold mb-1" style={{ fontFamily: "DM Sans, sans-serif" }}>Offline Auto-Response Message</label>
                      <textarea 
                        rows={2} 
                        value={selectedBot.offlineMessage} 
                        onChange={e => updateSelectedBot({ offlineMessage: e.target.value })}
                        className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-xs focus:outline-none bg-white resize-none"
                        style={{ fontFamily: "Outfit, sans-serif" }} 
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold mb-1" style={{ fontFamily: "DM Sans, sans-serif" }}>
                        Offline Manager / Coordinator
                      </label>
                      <select 
                        value={selectedBot.afterHoursPersonId} 
                        onChange={e => updateSelectedBot({ afterHoursPersonId: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg text-xs bg-white focus:outline-none"
                        style={{ fontFamily: "Outfit, sans-serif", color: '#020817' }}
                      >
                        <option value="">Select team member...</option>
                        {employees.map(emp => <option key={emp.id} value={emp.id}>{emp.name}</option>)}
                      </select>
                    </div>
                  </div>
                )}
              </AccordionSection>

              {/* 5. Human Handoff */}
              <AccordionSection
                title="Human Handoff"
                icon={<UserCheck className="w-5 h-5 text-indigo-600" />}
                iconBg="bg-indigo-100"
                defaultOpen={false}
                badge={selectedBot.handoffEnabled ? "On" : "Off"}
                badgeColor={selectedBot.handoffEnabled ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-800" style={{ fontFamily: "Outfit, sans-serif" }}>Allow contacts to trigger direct routing to staff</span>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input 
                      type="checkbox" 
                      className="sr-only peer" 
                      checked={selectedBot.handoffEnabled} 
                      onChange={e => updateSelectedBot({ handoffEnabled: e.target.checked })} 
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600" />
                  </label>
                </div>
                {selectedBot.handoffEnabled && (
                  <div className="space-y-3 pt-2">
                    <div>
                      <label className="block text-xs font-bold mb-1" style={{ fontFamily: "DM Sans, sans-serif" }}>Handoff Trigger Keyword</label>
                      <input 
                        type="text" 
                        value={selectedBot.handoffKeyword} 
                        onChange={e => updateSelectedBot({ handoffKeyword: e.target.value })}
                        placeholder="e.g. human, support, representative" 
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg text-xs bg-white focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold mb-1" style={{ fontFamily: "DM Sans, sans-serif" }}>
                        Assign Routed Contacts To
                      </label>
                      <select 
                        value={selectedBot.handoffPersonId} 
                        onChange={e => updateSelectedBot({ handoffPersonId: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg text-xs bg-white focus:outline-none"
                        style={{ fontFamily: "Outfit, sans-serif", color: '#020817' }}
                      >
                        <option value="">Select team member...</option>
                        {employees.map(emp => <option key={emp.id} value={emp.id}>{emp.name}</option>)}
                      </select>
                    </div>
                  </div>
                )}
              </AccordionSection>

              {/* 6. Appointment Booking */}
              <AccordionSection
                title="Appointment Booking"
                icon={<Calendar className="w-5 h-5 text-rose-600" />}
                iconBg="bg-rose-100"
                defaultOpen={false}
                badge={selectedBot.appointmentBookingEnabled ? "On" : "Off"}
                badgeColor={selectedBot.appointmentBookingEnabled ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-800" style={{ fontFamily: "Outfit, sans-serif" }}>Trigger scheduling campaign when intent is detected</span>
                  <label className="relative inline-flex items-center cursor-pointer font-normal">
                    <input 
                      type="checkbox" 
                      className="sr-only peer" 
                      checked={selectedBot.appointmentBookingEnabled} 
                      onChange={e => updateSelectedBot({ appointmentBookingEnabled: e.target.checked })} 
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600" />
                  </label>
                </div>
                {selectedBot.appointmentBookingEnabled && (
                  <div className="space-y-3 pt-2">
                    <div>
                      <label className="block text-xs font-bold mb-1" style={{ fontFamily: "DM Sans, sans-serif" }}>Linked Booking Flow Campaign</label>
                      <select 
                        value={selectedBot.appointmentCampaignId} 
                        onChange={e => updateSelectedBot({ appointmentCampaignId: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg text-xs bg-white focus:outline-none"
                        style={{ fontFamily: "Outfit, sans-serif", color: '#020817' }}
                      >
                        <option value="">Select campaign flow...</option>
                        {campaigns.map(c => <option key={c.id} value={c.id}>{c.name} ({c.status})</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-bold mb-1" style={{ fontFamily: "DM Sans, sans-serif" }}>
                        Booking Coordinator
                      </label>
                      <select 
                        value={selectedBot.appointmentPersonId} 
                        onChange={e => updateSelectedBot({ appointmentPersonId: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg text-xs bg-white focus:outline-none"
                        style={{ fontFamily: "Outfit, sans-serif", color: '#020817' }}
                      >
                        <option value="">Select team member...</option>
                        {employees.map(emp => <option key={emp.id} value={emp.id}>{emp.name}</option>)}
                      </select>
                    </div>
                  </div>
                )}
              </AccordionSection>
            </div>

            {/* Group 4: Advanced (always rendered) */}
            <div className="space-y-3">
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5 px-1" style={{ fontFamily: "Outfit, sans-serif" }}>Advanced</p>

              {/* 7. Escalation Rules */}
              <AccordionSection
                title="Escalation Rules"
                icon={<Shield className="w-5 h-5 text-orange-600" />}
                iconBg="bg-orange-100"
                defaultOpen={false}
                badge={selectedBot.escalationRules.filter(r => r.enabled).length > 0 ? `${selectedBot.escalationRules.filter(r => r.enabled).length} rules` : undefined}
                badgeColor="bg-orange-100 text-orange-700"
              >
                <p className="text-xs text-gray-500 leading-normal" style={{ fontFamily: "Outfit, sans-serif" }}>
                  Setup keyword intercepts: when patients say these exact terms, instantly assign to a specific specialist (bypassing AI).
                </p>
                <div className="space-y-2">
                  {selectedBot.escalationRules.map(rule => {
                    const person = employees.find(e => e.id === rule.responsiblePersonId);
                    return (
                      <div key={rule.id} className={`flex items-center justify-between p-3 border rounded-lg bg-white ${rule.enabled ? "border-gray-200" : "border-gray-100 opacity-60"}`}>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-0.5">
                            <span className="text-[10px] font-bold bg-orange-50 text-orange-700 px-2 py-0.5 rounded-full font-mono">{rule.keyword}</span>
                            {!rule.enabled && <span className="text-[9px] text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">Disabled</span>}
                          </div>
                          <p className="text-xs text-gray-500" style={{ fontFamily: "Outfit, sans-serif" }}>→ {person?.name || "Unassigned"}</p>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          <label className="relative inline-flex items-center cursor-pointer">
                            <input 
                              type="checkbox" 
                              className="sr-only peer" 
                              checked={rule.enabled}
                              onChange={() => {
                                updateSelectedBot({
                                  escalationRules: selectedBot.escalationRules.map(r => r.id === rule.id ? { ...r, enabled: !r.enabled } : r)
                                });
                              }} 
                            />
                            <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600" />
                          </label>
                          <button 
                            type="button"
                            onClick={() => {
                              setEditingEscalationId(rule.id);
                              setEscalationForm({ keyword: rule.keyword, responsiblePersonId: rule.responsiblePersonId });
                              setShowEscalationForm(true);
                            }}
                            className="p-1 hover:bg-gray-100 rounded"
                          >
                            <Pencil className="w-3.5 h-3.5 text-gray-500" />
                          </button>
                          <button 
                            type="button"
                            onClick={() => {
                              updateSelectedBot({
                                escalationRules: selectedBot.escalationRules.filter(r => r.id !== rule.id)
                              });
                              toast.success("Rule removed");
                            }}
                            className="p-1 hover:bg-red-50 rounded"
                          >
                            <Trash2 className="w-3.5 h-3.5 text-red-400" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {showEscalationForm && (
                  <div className="p-4 border border-blue-200 rounded-lg bg-blue-50/40 space-y-3">
                    <h4 className="text-xs font-bold text-gray-800" style={{ fontFamily: "DM Sans, sans-serif" }}>
                      {editingEscalationId ? "Edit Escalation Rule" : "New Escalation Rule"}
                    </h4>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-semibold text-gray-500 mb-1 uppercase tracking-wide">Keyword</label>
                        <input 
                          type="text" 
                          value={escalationForm.keyword} 
                          onChange={e => setEscalationForm(p => ({ ...p, keyword: e.target.value }))} 
                          placeholder="e.g. billing"
                          className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none" 
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-gray-500 mb-1 uppercase tracking-wide">Route To</label>
                        <select 
                          value={escalationForm.responsiblePersonId} 
                          onChange={e => setEscalationForm(p => ({ ...p, responsiblePersonId: e.target.value }))}
                          className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none" 
                          style={{ fontFamily: "Outfit, sans-serif", color: '#020817' }}
                        >
                          <option value="">Select person...</option>
                          {employees.map(emp => <option key={emp.id} value={emp.id}>{emp.name}</option>)}
                        </select>
                      </div>
                    </div>
                    <div className="flex justify-end gap-2">
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => {
                          setShowEscalationForm(false);
                          setEditingEscalationId(null);
                          setEscalationForm({ keyword: "", responsiblePersonId: "" });
                        }}
                      >
                        Cancel
                      </Button>
                      <Button variant="primary" size="sm" onClick={handleSaveEscalation}>Save Rule</Button>
                    </div>
                  </div>
                )}

                {!showEscalationForm && (
                  <button 
                    type="button" 
                    onClick={() => {
                      setEditingEscalationId(null);
                      setEscalationForm({ keyword: "", responsiblePersonId: "" });
                      setShowEscalationForm(true);
                    }}
                    className="w-full py-2 border-2 border-dashed border-gray-300 rounded-lg text-xs font-semibold text-blue-600 hover:border-blue-400 hover:bg-blue-50/30 transition-colors flex items-center justify-center gap-1.5"
                  >
                    <Plus className="w-3.5 h-3.5" /> Add Escalation Rule
                  </button>
                )}
              </AccordionSection>

              {/* 8. Fallback Message */}
              <AccordionSection
                title="Fallback Message"
                icon={<AlertTriangle className="w-5 h-5 text-yellow-600" />}
                iconBg="bg-yellow-100"
                defaultOpen={false}
              >
                <p className="text-xs text-gray-500" style={{ fontFamily: "Outfit, sans-serif" }}>
                  Fallback answer sent when confidence score is too low or query is out-of-scope.
                </p>
                <textarea 
                  rows={3} 
                  value={selectedBot.fallbackMessage} 
                  onChange={e => updateSelectedBot({ fallbackMessage: e.target.value })}
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none bg-white font-medium"
                  style={{ fontFamily: "Outfit, sans-serif" }} 
                />
              </AccordionSection>

              {/* 9. AI Model & Response Style */}
              <AccordionSection
                title="AI Model & Response Style"
                icon={<Settings className="w-5 h-5 text-gray-600" />}
                iconBg="bg-gray-100"
                defaultOpen={false}
              >
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold mb-1" style={{ fontFamily: "DM Sans, sans-serif" }}>AI Model Tier</label>
                    <select 
                      value={selectedBot.aiModelTier} 
                      onChange={e => updateSelectedBot({ aiModelTier: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg text-xs bg-white focus:outline-none"
                      style={{ fontFamily: "Outfit, sans-serif", color: '#020817' }}
                    >
                      <option value="Express">Express — Fast, lightweight</option>
                      <option value="Balanced">Balanced — Smart & swift</option>
                      <option value="Smartest">Smartest — Deep reasoning</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold mb-1" style={{ fontFamily: "DM Sans, sans-serif" }}>Response Style Tone</label>
                    <select 
                      value={selectedBot.aiVoiceStyle} 
                      onChange={e => updateSelectedBot({ aiVoiceStyle: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg text-xs bg-white focus:outline-none"
                      style={{ fontFamily: "Outfit, sans-serif", color: '#020817' }}
                    >
                      <option value="Professional">Professional</option>
                      <option value="Friendly">Friendly & Warm</option>
                      <option value="Concise">Concise</option>
                      <option value="Empathetic">Empathetic</option>
                    </select>
                  </div>
                </div>
                <div className="flex items-start gap-2 p-3 rounded-lg bg-gray-50 border border-gray-200">
                  <Info className="w-4 h-4 text-gray-400 flex-shrink-0 mt-0.5" />
                  <p className="text-[11px] text-gray-500 leading-normal" style={{ fontFamily: "Outfit, sans-serif" }}>
                    Select the underlying OpenAI LLM and response tone guidelines. Tier changes affect token billing rates.
                  </p>
                </div>
              </AccordionSection>

              {/* Master Save Trigger button */}
              <div className="pt-2">
                <Button 
                  variant="primary" 
                  className="w-full font-bold" 
                  onClick={() => toast.success("Bot settings saved")}
                >
                  Save All Settings
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // LEVEL 1 - Bot List view
  return (
    <div className="space-y-6">
      {/* List Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-900" style={{ fontFamily: "DM Sans, sans-serif" }}>Chatbots</h2>
          <p className="text-sm text-gray-500 mt-0.5" style={{ fontFamily: "Outfit, sans-serif" }}>
            Configure and deploy automated assistants across multiple communication channels
          </p>
        </div>
        <Button variant="primary" onClick={() => setShowNewBotModal(true)}>
          <Plus className="w-4 h-4" /> New Bot
        </Button>
      </div>

      {/* Bot Cards List */}
      {bots.length === 0 ? (
        <div className="bg-white border-2 border-dashed border-gray-200 rounded-xl p-16 text-center shadow-sm">
          <div className="w-14 h-14 rounded-full bg-blue-50 flex items-center justify-center mx-auto mb-4">
            <Bot className="w-7 h-7 text-blue-600" />
          </div>
          <h3 className="text-base font-bold text-gray-800 mb-1" style={{ fontFamily: "DM Sans, sans-serif" }}>No bots yet</h3>
          <p className="text-sm text-gray-500 mb-4" style={{ fontFamily: "Outfit, sans-serif" }}>
            Create your first automated assistant to start responding to customers.
          </p>
          <Button variant="primary" onClick={() => setShowNewBotModal(true)}>
            <Plus className="w-4 h-4" /> New Bot
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {bots.map(bot => {
            const hasWebsiteChan = bot.channels.includes("website");
            return (
              <div 
                key={bot.id} 
                className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm hover:shadow-md hover:border-gray-300 transition-all flex flex-col justify-between"
              >
                <div className="space-y-2">
                  {/* Bot Title Row */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {/* Active Status indicator */}
                      <span 
                        className={`w-2.5 h-2.5 rounded-full ${bot.active ? "bg-green-500" : "bg-gray-300 border border-gray-400"}`}
                        title={bot.active ? "Active" : "Inactive"}
                      />
                      <h3 className="text-sm font-bold text-gray-900" style={{ fontFamily: "DM Sans, sans-serif" }}>
                        {bot.name}
                      </h3>
                    </div>
                    {/* Status Pill Badge */}
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border uppercase ${
                      bot.active 
                        ? "bg-green-50 text-green-700 border-green-200" 
                        : "bg-gray-50 text-gray-500 border-gray-200"
                    }`}>
                      {bot.active ? "Active" : "Inactive"}
                    </span>
                  </div>

                  {/* Channel Badges */}
                  <div className="flex flex-wrap gap-1.5">
                    {bot.channels.length === 0 ? (
                      <span className="text-[10px] text-gray-400 italic font-semibold">No channels configured</span>
                    ) : (
                      bot.channels.map(ch => (
                        <span 
                          key={ch} 
                          className={`text-[9px] font-bold px-2 py-0.5 rounded-full uppercase border ${CHANNEL_CLASSES[ch]}`}
                        >
                          {CHANNEL_LABELS[ch]}
                        </span>
                      ))
                    )}
                  </div>

                  {/* Bot Description */}
                  <p className="text-xs text-gray-500 leading-relaxed font-normal" style={{ fontFamily: "Outfit, sans-serif" }}>
                    {bot.description}
                  </p>
                </div>

                {/* Edit Button Footer */}
                <div className="mt-4 pt-3.5 border-t border-gray-100 flex items-center justify-between">
                  <div className="text-[10px] text-gray-400 font-medium font-mono">
                    {hasWebsiteChan ? `ID: ${bot.siteId}` : `Rules: ${bot.escalationRules.length}`}
                  </div>
                  
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        if (confirm(`Are you sure you want to delete "${bot.name}"?`)) {
                          setBots(prev => prev.filter(b => b.id !== bot.id));
                          toast.success("Bot deleted successfully");
                        }
                      }}
                      className="p-1.5 hover:bg-red-50 text-gray-400 hover:text-red-500 rounded-lg transition-colors"
                      title="Delete bot"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                    
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => setSelectedBotId(bot.id)}
                      className="text-xs font-semibold py-1 px-3 text-blue-600 hover:text-blue-700"
                    >
                      Edit Bot →
                    </Button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* "+ New Bot" Overlay Modal */}
      {showNewBotModal && (
        <>
          <div 
            className="fixed inset-0 bg-black/40 z-40 backdrop-blur-[1px] transition-opacity" 
            onClick={() => setShowNewBotModal(false)} 
          />
          <div 
            className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white rounded-xl border border-gray-200 shadow-2xl z-50 overflow-hidden flex flex-col w-[480px] max-h-[90vh]"
          >
            {/* Modal Header */}
            <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between bg-gray-50 flex-shrink-0">
              <div className="flex items-center gap-2">
                <Bot className="w-5 h-5 text-blue-600" />
                <h3 className="text-sm font-bold text-gray-900" style={{ fontFamily: "DM Sans, sans-serif" }}>
                  Create New Assistant
                </h3>
              </div>
              <button 
                type="button"
                onClick={() => setShowNewBotModal(false)}
                className="text-gray-400 hover:text-gray-600 p-0.5 rounded-lg hover:bg-gray-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Steps Content */}
            <div className="p-6 overflow-y-auto space-y-4 flex-1">
              
              {/* Step 1: Basic Info */}
              {newBotStep === 1 && (
                <div className="space-y-4">
                  <div className="space-y-1">
                    <label className="block text-xs font-semibold text-gray-700" style={{ fontFamily: "DM Sans, sans-serif" }}>Bot Name *</label>
                    <input 
                      type="text" 
                      required 
                      value={newBotName}
                      onChange={e => setNewBotName(e.target.value)}
                      placeholder="e.g. Patient Care Bot"
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none" 
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="block text-xs font-semibold text-gray-700" style={{ fontFamily: "DM Sans, sans-serif" }}>Short Description</label>
                    <textarea 
                      rows={3} 
                      value={newBotDescription}
                      onChange={e => setNewBotDescription(e.target.value)}
                      placeholder="Explain what this bot does, e.g. Answers online website chats after-hours."
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none resize-none" 
                      style={{ fontFamily: "Outfit, sans-serif" }}
                    />
                  </div>
                </div>
              )}

              {/* Step 2: Channels Multi-Select */}
              {newBotStep === 2 && (
                <div className="space-y-4">
                  <label className="block text-xs font-semibold text-gray-700" style={{ fontFamily: "DM Sans, sans-serif" }}>Select Active Channels</label>
                  <p className="text-[11px] text-gray-400" style={{ fontFamily: "Outfit, sans-serif" }}>
                    Bind the bot to communication networks. A channel can only belong to one bot at a time.
                  </p>

                  <div className="space-y-3">
                    {(["whatsapp", "sms", "website"] as const).map(ch => {
                      const isChecked = newBotChannels.includes(ch);
                      const currentClaimant = getOccupyingBot(ch);

                      const handleCheckboxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
                        if (e.target.checked) {
                          setNewBotChannels([...newBotChannels, ch]);
                        } else {
                          setNewBotChannels(newBotChannels.filter(c => c !== ch));
                          // Reset confirmation if unchecked
                          setReassignConfirmed(prev => ({ ...prev, [ch]: false }));
                        }
                      };

                      return (
                        <div key={ch} className="border border-gray-200 rounded-lg p-3 bg-gray-50/50 space-y-2">
                          <label className="flex items-center gap-3 cursor-pointer select-none font-normal">
                            <input 
                              type="checkbox" 
                              checked={isChecked}
                              onChange={handleCheckboxChange}
                              className="w-4 h-4 rounded border-gray-300 text-blue-600" 
                            />
                            <div className="flex-1">
                              <span className="text-xs font-bold text-gray-800" style={{ fontFamily: "DM Sans, sans-serif" }}>{CHANNEL_LABELS[ch]}</span>
                              <p className="text-[10px] text-gray-400" style={{ fontFamily: "Outfit, sans-serif" }}>
                                {ch === "whatsapp" 
                                  ? "Automate responses for incoming patient WhatsApp chats." 
                                  : ch === "sms" 
                                    ? "Reply automatically to patient SMS text threads." 
                                    : "Deploy the floating web chat widget on your site."}
                              </p>
                            </div>
                          </label>

                          {/* Warning and confirmation check if occupied */}
                          {isChecked && currentClaimant && (
                            <div className="ml-7 p-2.5 rounded bg-yellow-50 border border-yellow-100 text-[10px] space-y-1.5">
                              <p className="text-yellow-800 font-medium">
                                ⚠ {CHANNEL_LABELS[ch]} is currently assigned to <strong>"{currentClaimant.name}"</strong>. Assigning it here will remove it from that bot.
                              </p>
                              <label className="flex items-center gap-2 cursor-pointer text-yellow-900 font-bold select-none">
                                <input
                                  type="checkbox"
                                  checked={!!reassignConfirmed[ch]}
                                  onChange={e => setReassignConfirmed(prev => ({ ...prev, [ch]: e.target.checked }))}
                                  className="w-3.5 h-3.5 rounded border-yellow-300 text-yellow-600 focus:ring-yellow-500"
                                />
                                <span>Yes, confirm reassignment</span>
                              </label>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Step 3: Template Cloner */}
              {newBotStep === 3 && (
                <div className="space-y-4">
                  <label className="block text-xs font-semibold text-gray-700" style={{ fontFamily: "DM Sans, sans-serif" }}>Clone Config From Existing Bot</label>
                  <p className="text-[11px] text-gray-400" style={{ fontFamily: "Outfit, sans-serif" }}>
                    Accelerate setup by copying objectives, context info, and rules from an existing bot template.
                  </p>

                  <select 
                    value={newBotSourceId} 
                    onChange={e => setNewBotSourceId(e.target.value)}
                    className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none"
                    style={{ fontFamily: "Outfit, sans-serif", color: '#020817' }}
                  >
                    <option value="blank">Blank — Start fresh from scratch</option>
                    {bots.map(b => (
                      <option key={b.id} value={b.id}>Template: {b.name}</option>
                    ))}
                  </select>
                </div>
              )}

            </div>

            {/* Modal Actions Footer */}
            <div className="px-5 py-4 border-t border-gray-100 flex items-center justify-between bg-gray-50 flex-shrink-0">
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => {
                  if (newBotStep === 1) {
                    setShowNewBotModal(false);
                  } else {
                    setNewBotStep(newBotStep - 1);
                  }
                }}
              >
                {newBotStep === 1 ? "Cancel" : "Back"}
              </Button>

              <Button 
                variant="primary" 
                size="sm"
                disabled={
                  (newBotStep === 1 && !newBotName.trim()) ||
                  (newBotStep === 2 && newBotChannels.some(ch => getOccupyingBot(ch) && !reassignConfirmed[ch]))
                }
                onClick={() => {
                  if (newBotStep < 3) {
                    setNewBotStep(newBotStep + 1);
                  } else {
                    handleCreateBot();
                  }
                }}
              >
                {newBotStep === 3 ? "Create Bot" : "Next"}
              </Button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
