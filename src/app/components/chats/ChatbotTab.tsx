import React, { useState, useEffect } from "react";
import { toast } from "sonner";
import { Search, Plus, Trash2, Pencil, Bot, LibraryBig } from "lucide-react";

import { Campaign, WhatsappTemplate, EscalationRule, TemplateRule } from "../../pages/Chats";
import ChatbotFlowBuilder, { ChatbotFlowNode } from "./ChatbotFlowBuilder";
import { DynamicResponse, HandoffNoResponse, ButtonAction } from "../../../lib/chatbotTypes";
import ChatbotLibraryDrawer from "./ChatbotLibraryDrawer";
import { cloneLibraryBotNodes, LibraryBot } from "../../../lib/chatbotLibrary";
import { useChatbotBots } from "../../../lib/useChatbotBots";
import TableComponent, { TableColumn } from "../ui/TableComponent";

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
  businessHoursEnabled: boolean;
  afterHoursPersonId: string;
  offlineMessage: string;
  handoffEnabled: boolean;
  handoffKeyword?: string;          // Deprecated, kept for fallback
  handoffPersonId?: string;         // Deprecated, kept for fallback
  handoffQuestionText?: string;     // Question asked when human handoff is triggered
  handoffYesPersonId?: string;      // Assigned person on "Yes"
  handoffNoResponse?: HandoffNoResponse; // Response on "No"
  appointmentBookingEnabled: boolean;
  appointmentCampaignId: string;
  appointmentPersonId: string;
  // Advanced
  escalationRules: EscalationRule[];
  fallbackMessage?: string;          // Deprecated, kept for fallback
  fallbackResponse?: DynamicResponse; // Dynamic response (Text/Question/Template)
  aiModelTier: string;
  aiVoiceStyle: string;
  businessHoursMode?: "inherit" | "custom";
  templateRules?: TemplateRule[];
  knowledgeBases?: any[];
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
  linkedProcessId?: string;
  flow?: {
    nodes: ChatbotFlowNode[];
  };
}

export function getEffectiveFallbackResponse(bot: Bot): DynamicResponse {
  if (bot.fallbackResponse) {
    return bot.fallbackResponse;
  }
  return {
    type: "text",
    text: bot.fallbackMessage || "I'm not sure I understood that. Could you rephrase, or would you like to speak with a team member?"
  };
}

interface ChatbotTabProps {
  campaigns: Campaign[];
  employees: { id: string; name: string }[];
  templates?: WhatsappTemplate[];
  statusFilter?: "all" | "active" | "inactive";
}

export const sanitizeBot = (b: Bot): Bot => ({
  ...b,
  channels: (b.channels || []).filter((c) => c !== "sms"),
});

export const SEED_BOTS: Bot[] = [
  {
    id: "bot-1",
    name: "WhatsApp Bot",
    description: "Automated assistant for WhatsApp customer service.",
    channels: ["whatsapp"],
    active: true,
    greetingMessage: "Hello! 👋 Welcome to Mantra Health. How can I help you today?",
    aiObjective: "You are a helpful AI assistant for Mantra Health. Your goal is to answer patient questions, help schedule appointments, and provide information about our services. Always be empathetic, concise, and professional. Escalate to a human when the patient asks for one.",
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
      { id: "esc-1", keyword: "cancel subscription", matchType: "contains", responsiblePersonId: "2", enabled: true },
      { id: "esc-2", keyword: "complaint", matchType: "contains", responsiblePersonId: "1", enabled: true },
    ],
    businessHoursMode: "inherit",
    templateRules: [],
    knowledgeBases: [],
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
    businessHoursMode: "inherit",
    templateRules: [],
    knowledgeBases: [],
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

import { availableProcesses } from "../ui/ProcessStageSelect";

export default function ChatbotTab({ campaigns, employees, templates = [], statusFilter = "all" }: ChatbotTabProps) {
  const [bots, setBots] = useChatbotBots();
  const [botSearchQuery, setBotSearchQuery] = useState("");
  const [flowBuilderBotId, setFlowBuilderBotId] = useState<string | null>(null);
  const [showChatbotLibrary, setShowChatbotLibrary] = useState(false);

  const handleUseLibraryBot = (libBot: LibraryBot) => {
    setShowChatbotLibrary(false);
    let botName = libBot.name;
    if (bots.some(b => b.name.toLowerCase() === botName.toLowerCase())) {
      botName = `${libBot.name} (Copy)`;
    }

    const newNodes = cloneLibraryBotNodes(libBot.flow.nodes);
    const newId = `bot-${Date.now()}`;

    const newBot: Bot = {
      id: newId,
      name: botName,
      description: libBot.description,
      channels: (libBot.channels || ["whatsapp"]).filter(c => c !== "sms"),
      active: true,
      greetingMessage: "Hello! Welcome to our automated chatbot.",
      aiObjective: "Assist contacts with their inquiries",
      businessHoursEnabled: false,
      afterHoursPersonId: "",
      offlineMessage: "Our clinic is currently closed.",
      handoffEnabled: true,
      appointmentBookingEnabled: false,
      appointmentCampaignId: "",
      appointmentPersonId: "",
      escalationRules: [],
      aiModelTier: "standard",
      aiVoiceStyle: "professional",
      siteId: `site-${Math.random().toString(36).slice(2, 9)}`,
      allowedDomains: ["*"],
      widgetName: botName,
      widgetAvatarUrl: "",
      flow: { nodes: newNodes },
      // Initialize required missing fields with defaults
      fallbackMessage: "I'm sorry, I didn't quite get that.",
      widgetPrimaryColor: "#3B82F6",
      launcherStyle: "icon",
      widgetPosition: "bottom-right",
      widgetSize: "standard",
      proactiveTrigger: "off",
      proactiveDelaySeconds: 5,
      soundOnNewMessage: true,
      mobileBehavior: "floating"
    } as Bot;

    setBots(prev => [...prev, newBot]);
    setFlowBuilderBotId(newId);
    toast.success(`"${botName}" added from library — review and save to activate`);
  };

  const handleCreateBot = () => {
    const newId = `bot_${Date.now()}`;
    const siteId = `site_${Math.random().toString(36).substring(2, 8)}`;
    const newBot: Bot = {
      id: newId,
      name: "Untitled Bot",
      description: "Chatbot flow builder automation.",
      channels: [],
      active: true,
      greetingMessage: "Hello! How can I help you today?",
      aiObjective: "You are a helpful customer assistant. Answer questions clearly and politely.",
      businessHoursEnabled: false,
      afterHoursPersonId: "",
      offlineMessage: "We are currently offline.",
      handoffEnabled: false,
      handoffKeyword: "human",
      handoffPersonId: "",
      appointmentBookingEnabled: false,
      appointmentCampaignId: "",
      appointmentPersonId: "",
      escalationRules: [],
      businessHoursMode: "inherit",
      templateRules: [],
      knowledgeBases: [],
      fallbackMessage: "I'm sorry, I didn't quite get that. Could you please rephrase?",
      aiModelTier: "Balanced",
      aiVoiceStyle: "Friendly",
      siteId,
      allowedDomains: [],
      widgetName: "Assistant",
      widgetAvatarUrl: "",
      widgetPrimaryColor: "#3B82F6",
      launcherStyle: "icon",
      widgetPosition: "bottom-right",
      widgetSize: "standard",
      proactiveTrigger: "off",
      proactiveDelaySeconds: 5,
      soundOnNewMessage: true,
      mobileBehavior: "floating",
      flow: {
        nodes: [
          {
            id: "entry-router",
            type: "entryRouter",
            position: { x: 350, y: 120 },
            data: {
              showReturningStage: true,
              processesOrder: [...availableProcesses],
              excludedProcesses: []
            },
            connections: []
          }
        ]
      }
    };

    setBots((prev) => [...prev, newBot]);
    setFlowBuilderBotId(newId);
    toast.success("Blank chatbot created");
  };

  return (
    <>
      {/* ── FLOW BUILDER VIEW ── */}
      {flowBuilderBotId && (() => {
        const builderBot = bots.find(b => b.id === flowBuilderBotId);
        if (!builderBot) return null;
        return (
          <ChatbotFlowBuilder
            bot={builderBot}
            employees={employees}
            templates={templates}
            allBots={bots}
            onClose={() => setFlowBuilderBotId(null)}
            onSave={(updatedBot) => {
              setBots(prev => prev.map(b => b.id === updatedBot.id ? updatedBot : b));
              toast.success(`"${updatedBot.name}" saved successfully`);
            }}
          />
        );
      })()}

      {/* ── TABLE LIST VIEW ── */}
      {!flowBuilderBotId && (
        <div className="min-h-[calc(100vh-200px)] flex flex-col gap-4">

          {/* Page Header Row */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <h2 className="text-xl font-bold text-gray-900" style={{ fontFamily: "DM Sans, sans-serif" }}>
                Chatbots
              </h2>
              <span className="bg-blue-50 text-blue-600 text-xs font-semibold px-2.5 py-1 rounded-full border border-blue-100">
                {bots.length} {bots.length === 1 ? "bot" : "bots"}
              </span>
            </div>
            <div className="flex items-center gap-3">
              {/* Search */}
              <div className="relative">
                <Search className="w-4 h-4 text-gray-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  placeholder="Search bots..."
                  value={botSearchQuery}
                  onChange={(e) => setBotSearchQuery(e.target.value)}
                  className="pl-9 pr-4 py-2 border border-gray-200 rounded-xl text-xs bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 transition-all text-gray-900 w-56"
                  style={{ fontFamily: "Outfit, sans-serif" }}
                />
              </div>
              {/* Browse Library Button */}
              <button
                type="button"
                onClick={() => setShowChatbotLibrary(true)}
                className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 text-gray-700 rounded-xl text-sm font-semibold hover:bg-gray-50 transition-all shadow-xs cursor-pointer"
                style={{ fontFamily: "DM Sans, sans-serif" }}
              >
                <LibraryBig className="w-4 h-4 text-gray-500" />
                Browse Library
              </button>
              {/* Create Chatbot Button */}
              <button
                type="button"
                onClick={handleCreateBot}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-semibold hover:bg-blue-700 transition-all shadow-sm hover:shadow-md cursor-pointer"
                style={{ fontFamily: "DM Sans, sans-serif" }}
              >
                <Plus className="w-4 h-4" />
                Create Chatbot
              </button>
            </div>
          </div>

          {/* Bots Table — Always Rendered */}
          {/* Bots Table */}
          {(() => {
            const filteredBots = bots.filter((b) => {
              const matchesSearch =
                !botSearchQuery ||
                b.name.toLowerCase().includes(botSearchQuery.toLowerCase()) ||
                b.description.toLowerCase().includes(botSearchQuery.toLowerCase());
              const matchesStatus =
                statusFilter === "all" ? true : statusFilter === "active" ? b.active : !b.active;
              return matchesSearch && matchesStatus;
            });

            if (bots.length === 0) {
              return (
                <div className="py-16 text-center bg-white rounded-xl border border-gray-200">
                  <div className="w-16 h-16 rounded-full bg-blue-50 flex items-center justify-center mx-auto mb-4 shadow-inner">
                    <Bot className="w-8 h-8 text-blue-400" />
                  </div>
                  <h3 className="text-lg font-bold text-gray-900 mb-1" style={{ fontFamily: "DM Sans, sans-serif" }}>
                    No chatbots yet
                  </h3>
                  <p className="text-xs text-gray-500 max-w-xs mx-auto mb-5" style={{ fontFamily: "Outfit, sans-serif" }}>
                    Build your first automated chatbot to handle inbound messages across WhatsApp and your website.
                  </p>
                  <div className="flex items-center justify-center gap-3">
                    <button
                      type="button"
                      onClick={() => setShowChatbotLibrary(true)}
                      className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 text-gray-700 rounded-xl text-xs font-semibold hover:bg-gray-50 transition-all shadow-xs cursor-pointer"
                      style={{ fontFamily: "DM Sans, sans-serif" }}
                    >
                      <LibraryBig className="w-4 h-4 text-gray-500" />
                      Browse Chatbot Library
                    </button>
                    <button
                      type="button"
                      onClick={handleCreateBot}
                      className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl text-xs font-semibold hover:bg-blue-700 transition-all shadow-sm cursor-pointer"
                      style={{ fontFamily: "DM Sans, sans-serif" }}
                    >
                      <Plus className="w-4 h-4" />
                      Create Your First Chatbot
                    </button>
                  </div>
                </div>
              );
            }

            const botColumns: TableColumn<Bot>[] = [
              {
                header: "Bot Name",
                accessorKey: "name",
                align: "left",
                render: (bot) => (
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-100 to-indigo-100 flex items-center justify-center flex-shrink-0 shadow-sm">
                      <Bot className="w-4.5 h-4.5 text-blue-600" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-gray-900 group-hover:text-blue-600 transition-colors" style={{ fontFamily: "DM Sans, sans-serif" }}>
                        {bot.name}
                      </p>
                      <p className="text-[11px] text-gray-400 truncate max-w-[200px]" style={{ fontFamily: "Outfit, sans-serif" }}>
                        {bot.description}
                      </p>
                    </div>
                  </div>
                ),
              },
              {
                header: "Channels",
                align: "left",
                render: (bot) => {
                  const displayChannels = (bot.channels || []).filter((ch) => ch !== "sms");
                  if (displayChannels.length === 0) {
                    return <span className="text-xs text-gray-400 italic">No channels</span>;
                  }
                  return (
                    <div className="flex flex-wrap gap-1.5">
                      {displayChannels.map((ch) => (
                        <span
                          key={ch}
                          className={`text-[10px] px-2 py-0.5 rounded-full font-semibold border ${CHANNEL_CLASSES[ch]}`}
                        >
                          {CHANNEL_LABELS[ch]}
                        </span>
                      ))}
                    </div>
                  );
                },
              },
              {
                header: "Status",
                accessorKey: "active",
                align: "center",
                render: (bot) => (
                  <label className="relative inline-flex items-center gap-2 cursor-pointer group/toggle" onClick={(e) => e.stopPropagation()}>
                    <input
                      type="checkbox"
                      className="sr-only peer"
                      checked={bot.active}
                      onChange={(e) => {
                        setBots((prev) =>
                          prev.map((b) => (b.id === bot.id ? { ...b, active: e.target.checked } : b))
                        );
                        toast.success(e.target.checked ? `"${bot.name}" enabled` : `"${bot.name}" disabled`);
                      }}
                    />
                    <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-green-500 relative" />
                    <span className={`text-xs font-semibold ${bot.active ? "text-green-600" : "text-gray-400"}`}>
                      {bot.active ? "Active" : "Inactive"}
                    </span>
                  </label>
                ),
              },
              {
                header: "Flow Nodes",
                align: "center",
                render: (bot) => {
                  const nodeCount = bot.flow?.nodes?.length ?? 0;
                  return (
                    <div className="flex items-center justify-center gap-1.5">
                      <span className={`text-xs font-bold ${nodeCount > 1 ? "text-blue-600" : "text-gray-400"}`}>
                        {nodeCount}
                      </span>
                      <span className="text-xs text-gray-400">
                        {nodeCount === 1 ? "node" : "nodes"}
                      </span>
                    </div>
                  );
                },
              },
            ];

            return (
              <TableComponent
                columns={botColumns}
                data={filteredBots}
                getRowId={(bot) => bot.id}
                onRowClick={(bot) => setFlowBuilderBotId(bot.id)}
                rowActions={[
                  {
                    label: "Edit Flow Builder",
                    icon: <Pencil className="w-4 h-4 text-gray-500" />,
                    onClick: (bot) => setFlowBuilderBotId(bot.id),
                  },
                  {
                    label: "Delete Chatbot",
                    icon: <Trash2 className="w-4 h-4 text-red-500" />,
                    isDanger: true,
                    onClick: (bot) => {
                      if (confirm(`Delete "${bot.name}"? This cannot be undone.`)) {
                        setBots((prev) => prev.filter((b) => b.id !== bot.id));
                        toast.success(`"${bot.name}" deleted`);
                      }
                    },
                  },
                ]}
                emptyMessage="No chatbots match your filters."
              />
            );
          })()}
        </div>
      )}

      <ChatbotLibraryDrawer
        isOpen={showChatbotLibrary}
        onClose={() => setShowChatbotLibrary(false)}
        onSelectBot={handleUseLibraryBot}
      />
    </>
  );
}
