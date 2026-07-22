import React, { useState, useEffect } from "react";
import { toast } from "sonner";
import { Search, Plus, Trash2, Pencil, Bot } from "lucide-react";

import { Campaign, WhatsappTemplate, EscalationRule, TemplateRule } from "../../pages/Chats";
import ChatbotFlowBuilder, { ChatbotFlowNode } from "./ChatbotFlowBuilder";
import { DynamicResponse, HandoffNoResponse, ButtonAction } from "../../../lib/chatbotTypes";

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

const SEED_BOTS: Bot[] = [
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
  const [bots, setBots] = useState<Bot[]>(() => {
    const stored = localStorage.getItem("chatbotBots");
    return stored ? JSON.parse(stored).map(sanitizeBot) : SEED_BOTS.map(sanitizeBot);
  });
  const [flowBuilderBotId, setFlowBuilderBotId] = useState<string | null>(null);
  const [botSearchQuery, setBotSearchQuery] = useState("");

  useEffect(() => {
    localStorage.setItem("chatbotBots", JSON.stringify(bots));
  }, [bots]);

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

          {/* Bots Table */}
          {bots.length === 0 ? (
            /* Empty state */
            <div className="flex-1 flex flex-col items-center justify-center py-20 bg-white rounded-2xl border border-gray-200 shadow-sm">
              <div className="w-20 h-20 rounded-full bg-blue-50 flex items-center justify-center mb-5 shadow-inner">
                <Bot className="w-10 h-10 text-blue-400" />
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-2" style={{ fontFamily: "DM Sans, sans-serif" }}>
                No chatbots yet
              </h3>
              <p className="text-sm text-gray-500 max-w-xs text-center mb-6" style={{ fontFamily: "Outfit, sans-serif" }}>
                Build your first automated chatbot to handle inbound messages across WhatsApp and your website.
              </p>
              <button
                type="button"
                onClick={handleCreateBot}
                className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-semibold hover:bg-blue-700 transition-all shadow-sm cursor-pointer"
                style={{ fontFamily: "DM Sans, sans-serif" }}
              >
                <Plus className="w-4 h-4" />
                Create Your First Chatbot
              </button>
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
              <table className="w-full">
                {/* Table Header */}
                <thead style={{ backgroundColor: "#1F2937" }}>
                  <tr>
                    <th className="text-left px-5 py-3 text-[11px] font-bold text-white uppercase tracking-wider">
                      Bot Name
                    </th>
                    <th className="text-left px-4 py-3 text-[11px] font-bold text-white uppercase tracking-wider">
                      Channels
                    </th>
                    <th className="text-left px-4 py-3 text-[11px] font-bold text-white uppercase tracking-wider">
                      Status
                    </th>
                    <th className="text-left px-4 py-3 text-[11px] font-bold text-white uppercase tracking-wider">
                      Flow Nodes
                    </th>
                    <th className="text-right px-5 py-3 text-[11px] font-bold text-white uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {bots
                    .filter(b => {
                      const matchesSearch = !botSearchQuery ||
                        b.name.toLowerCase().includes(botSearchQuery.toLowerCase()) ||
                        b.description.toLowerCase().includes(botSearchQuery.toLowerCase());
                      const matchesStatus = statusFilter === "all" ? true : statusFilter === "active" ? b.active : !b.active;
                      return matchesSearch && matchesStatus;
                    })
                    .map((bot) => {
                      const nodeCount = bot.flow?.nodes?.length ?? 0;
                      const displayChannels = (bot.channels || []).filter(ch => ch !== "sms");
                      return (
                        <tr
                          key={bot.id}
                          className="hover:bg-blue-50/30 transition-colors group"
                        >
                          {/* Bot Name */}
                          <td className="px-5 py-4">
                            <button
                              type="button"
                              onClick={() => setFlowBuilderBotId(bot.id)}
                              className="text-left group/name cursor-pointer"
                            >
                              <div className="flex items-center gap-3">
                                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-100 to-indigo-100 flex items-center justify-center flex-shrink-0 shadow-sm">
                                  <Bot className="w-4.5 h-4.5 text-blue-600" />
                                </div>
                                <div>
                                  <p className="text-sm font-bold text-gray-900 group-hover/name:text-blue-600 transition-colors" style={{ fontFamily: "DM Sans, sans-serif" }}>
                                    {bot.name}
                                  </p>
                                  <p className="text-[11px] text-gray-400 truncate max-w-[200px]" style={{ fontFamily: "Outfit, sans-serif" }}>
                                    {bot.description}
                                  </p>
                                </div>
                              </div>
                            </button>
                          </td>

                          {/* Channels */}
                          <td className="px-4 py-4">
                            <div className="flex flex-wrap gap-1.5">
                              {displayChannels.length === 0 ? (
                                <span className="text-xs text-gray-400 italic">No channels</span>
                              ) : (
                                displayChannels.map(ch => (
                                  <span
                                    key={ch}
                                    className={`text-[10px] px-2 py-0.5 rounded-full font-semibold border ${CHANNEL_CLASSES[ch]}`}
                                  >
                                    {CHANNEL_LABELS[ch]}
                                  </span>
                                ))
                              )}
                            </div>
                          </td>

                          {/* Status */}
                          <td className="px-4 py-4">
                            <label className="relative inline-flex items-center gap-2 cursor-pointer group/toggle">
                              <input
                                type="checkbox"
                                className="sr-only peer"
                                checked={bot.active}
                                onChange={(e) => {
                                  setBots(prev => prev.map(b =>
                                    b.id === bot.id ? { ...b, active: e.target.checked } : b
                                  ));
                                  toast.success(e.target.checked ? `"${bot.name}" enabled` : `"${bot.name}" disabled`);
                                }}
                              />
                              <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-green-500 relative" />
                              <span className={`text-xs font-semibold ${bot.active ? "text-green-600" : "text-gray-400"}`}>
                                {bot.active ? "Active" : "Inactive"}
                              </span>
                            </label>
                          </td>

                          {/* Flow Nodes */}
                          <td className="px-4 py-4">
                            <div className="flex items-center gap-1.5">
                              <span className={`text-xs font-bold ${nodeCount > 1 ? "text-blue-600" : "text-gray-400"}`}>
                                {nodeCount}
                              </span>
                              <span className="text-xs text-gray-400">
                                {nodeCount === 1 ? "node" : "nodes"}
                              </span>
                            </div>
                          </td>

                          {/* Actions */}
                          <td className="px-5 py-4">
                            <div className="flex items-center gap-2 justify-end">
                              <button
                                type="button"
                                title="Open Flow Builder"
                                onClick={() => setFlowBuilderBotId(bot.id)}
                                className="p-2 rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-colors cursor-pointer"
                              >
                                <Pencil className="w-4 h-4" />
                              </button>
                              <button
                                type="button"
                                title="Delete bot"
                                onClick={() => {
                                  if (confirm(`Delete "${bot.name}"? This cannot be undone.`)) {
                                    setBots(prev => prev.filter(b => b.id !== bot.id));
                                    toast.success(`"${bot.name}" deleted`);
                                  }
                                }}
                                className="p-2 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors cursor-pointer"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>

              {/* Table Footer: count */}
              <div className="px-5 py-3 border-t border-gray-100 bg-gray-50/50 flex items-center justify-between">
                <span className="text-xs text-gray-400" style={{ fontFamily: "Outfit, sans-serif" }}>
                  {bots.length} {bots.length === 1 ? "bot" : "bots"} total
                </span>
                <span className="text-xs text-gray-400" style={{ fontFamily: "Outfit, sans-serif" }}>
                  Multiple bots can share channels — no priority restriction
                </span>
              </div>
            </div>
          )}
        </div>
      )}
    </>
  );
}
