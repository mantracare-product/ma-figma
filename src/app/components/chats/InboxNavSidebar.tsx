import React, { useState, useEffect } from "react";
import {
  ChevronDown,
  ChevronRight,
  Inbox as InboxIcon,
  MessageCircle,
  MessageSquare,
  Globe,
  BarChart2,
  FileText,
  Bot,
  PanelLeftClose,
  PanelLeftOpen,
} from "lucide-react";
import { ChannelType } from "../../../constants/channels";

export type TabKey = "chats" | "campaigns" | "templates" | "chatbot";

interface ChatsNavSidebarProps {
  activeTab: TabKey;
  onTabChange: (tab: TabKey) => void;
  channelFilter: "all" | ChannelType | null;
  setChannelFilter: (v: "all" | ChannelType) => void;
  showChatbotTab?: boolean; // NEW — defaults to true for backward compatibility
}

function NavRow({
  icon,
  label,
  active,
  onClick,
  isSubItem = false,
}: {
  icon?: React.ReactNode;
  label: string;
  active?: boolean;
  onClick?: () => void;
  isSubItem?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs transition-colors ${isSubItem ? "pl-7" : ""
        } ${active
          ? "bg-green-50 text-green-800 font-semibold shadow-xs"
          : "text-gray-700 hover:bg-gray-100"
        }`}
      style={{ fontFamily: "Outfit, sans-serif" }}
    >
      {icon}
      <span className="flex-1 text-left truncate">{label}</span>
    </button>
  );
}

export default function InboxNavSidebar({
  activeTab,
  onTabChange,
  channelFilter,
  setChannelFilter,
  showChatbotTab = true,
}: ChatsNavSidebarProps) {
  const [collapsed, setCollapsed] = useState<boolean>(() => {
    try {
      return sessionStorage.getItem("chats_sidebar_collapsed") === "true";
    } catch {
      return false;
    }
  });

  const [whatsappExpanded, setWhatsappExpanded] = useState<boolean>(true);

  const toggleCollapsed = () => {
    setCollapsed(prev => {
      const next = !prev;
      try {
        sessionStorage.setItem("chats_sidebar_collapsed", String(next));
      } catch { }
      return next;
    });
  };

  // Derived active flags
  const isWaInboxActive = activeTab === "chats" && channelFilter === "whatsapp";
  const isWaTemplatesActive = activeTab === "templates";
  const isWaCampaignsActive = activeTab === "campaigns";
  const isWhatsAppGroupActive = isWaInboxActive || isWaTemplatesActive || isWaCampaignsActive;
  const isSmsActive = activeTab === "chats" && channelFilter === "sms";
  const isWebsiteActive = activeTab === "chats" && channelFilter === "website";

  // Auto-expand when deep-linking directly to templates/campaigns
  useEffect(() => {
    if (isWhatsAppGroupActive) setWhatsappExpanded(true);
  }, [isWhatsAppGroupActive]);

  // Handlers
  const handleWhatsAppInbox = () => { onTabChange("chats"); setChannelFilter("whatsapp"); };
  const handleWhatsAppTemplates = () => { onTabChange("templates"); };
  const handleWhatsAppCampaigns = () => { onTabChange("campaigns"); };
  const handleSms = () => { onTabChange("chats"); setChannelFilter("sms"); };
  const handleWebsite = () => { onTabChange("chats"); setChannelFilter("website"); };

  // ── Collapsed icon-rail ─────────────────────────────────────────────────────
  if (collapsed) {
    return (
      <div className="w-[56px] shrink-0 border-r border-gray-200 flex flex-col h-full bg-white items-center py-3 space-y-4">
        <button
          type="button"
          onClick={toggleCollapsed}
          className="p-2 hover:bg-gray-100 rounded-lg text-gray-500 transition-colors"
          title="Expand sidebar"
        >
          <PanelLeftOpen className="w-5 h-5" />
        </button>

        <div className="w-8 h-px bg-gray-200" />

        <div className="flex-1 space-y-2 flex flex-col items-center">
          {/* WhatsApp — expands sidebar to reveal Inbox / Templates / Campaigns */}
          <button
            type="button"
            onClick={toggleCollapsed}
            className={`p-2.5 rounded-lg transition-colors ${isWhatsAppGroupActive ? "bg-green-50 text-green-800" : "text-gray-600 hover:bg-gray-100"
              }`}
            title="WhatsApp — expand sidebar to pick Inbox, Templates, or Campaigns"
          >
            <MessageCircle className="w-5 h-5 text-[#25D366]" />
          </button>

          {/* SMS — direct navigate */}
          <button
            type="button"
            onClick={handleSms}
            className={`p-2.5 rounded-lg transition-colors ${isSmsActive ? "bg-green-50 text-green-800" : "text-gray-600 hover:bg-gray-100"
              }`}
            title="SMS"
          >
            <MessageSquare className="w-5 h-5 text-blue-600" />
          </button>

          {/* Website — direct navigate */}
          <button
            type="button"
            onClick={handleWebsite}
            className={`p-2.5 rounded-lg transition-colors ${isWebsiteActive ? "bg-green-50 text-green-800" : "text-gray-600 hover:bg-gray-100"
              }`}
            title="Website"
          >
            <Globe className="w-5 h-5 text-purple-600" />
          </button>

          {/* Chatbot */}
          {showChatbotTab && (
            <button
              type="button"
              onClick={() => onTabChange("chatbot")}
              className={`p-2.5 rounded-lg transition-colors ${activeTab === "chatbot" ? "bg-green-50 text-green-800" : "text-gray-600 hover:bg-gray-100"
                }`}
              title="Chatbot"
            >
              <Bot className="w-5 h-5 text-purple-600" />
            </button>
          )}
        </div>
      </div>
    );
  }

  // ── Expanded sidebar ────────────────────────────────────────────────────────
  return (
    <div className="w-[220px] shrink-0 border-r border-gray-200 flex flex-col h-full bg-white select-none">
      {/* Header */}
      <div className="px-4 py-3.5 border-b border-gray-200 flex items-center justify-between">
        <h3
          className="text-sm font-bold text-gray-900"
          style={{ fontFamily: "DM Sans, sans-serif" }}
        >
          All Channels
        </h3>
        <button
          type="button"
          onClick={toggleCollapsed}
          className="p-1 hover:bg-gray-100 rounded-lg text-gray-400"
          title="Collapse sidebar"
        >
          <PanelLeftClose className="w-4 h-4" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-2 py-3 space-y-3">
        {/* 1. WHATSAPP — expandable group */}
        <div>
          <div
            onClick={() => setWhatsappExpanded(prev => !prev)}
            className={`w-full flex items-center justify-between px-2.5 py-2 rounded-lg cursor-pointer transition-colors ${isWhatsAppGroupActive
                ? "bg-green-50 text-green-800 font-semibold"
                : "text-gray-800 hover:bg-gray-100"
              }`}
          >
            <div
              className="flex items-center gap-2 text-xs font-bold"
              style={{ fontFamily: "DM Sans, sans-serif" }}
            >
              <MessageCircle className="w-4 h-4 text-[#25D366]" />
              <span>WhatsApp</span>
            </div>
            {whatsappExpanded
              ? <ChevronDown className="w-3.5 h-3.5 text-gray-500" />
              : <ChevronRight className="w-3.5 h-3.5 text-gray-500" />}
          </div>

          {whatsappExpanded && (
            <div className="mt-1 space-y-0.5">
              <NavRow
                icon={<InboxIcon className="w-4 h-4 text-green-700" />}
                label="Inbox"
                active={isWaInboxActive}
                onClick={handleWhatsAppInbox}
                isSubItem
              />
              <NavRow
                icon={<FileText className="w-4 h-4 text-indigo-600" />}
                label="Templates"
                active={isWaTemplatesActive}
                onClick={handleWhatsAppTemplates}
                isSubItem
              />
              <NavRow
                icon={<BarChart2 className="w-4 h-4 text-blue-600" />}
                label="Campaigns"
                active={isWaCampaignsActive}
                onClick={handleWhatsAppCampaigns}
                isSubItem
              />
            </div>
          )}
        </div>

        {/* 2. SMS — leaf */}
        <button
          type="button"
          onClick={handleSms}
          className={`w-full flex items-center gap-2 px-2.5 py-2 rounded-lg transition-colors text-xs font-bold ${isSmsActive ? "bg-green-50 text-green-800" : "text-gray-800 hover:bg-gray-100"
            }`}
          style={{ fontFamily: "DM Sans, sans-serif" }}
        >
          <MessageSquare className="w-4 h-4 text-blue-600" />
          <span>SMS</span>
        </button>

        {/* 3. WEBSITE — leaf */}
        <button
          type="button"
          onClick={handleWebsite}
          className={`w-full flex items-center gap-2 px-2.5 py-2 rounded-lg transition-colors text-xs font-bold ${isWebsiteActive ? "bg-green-50 text-green-800" : "text-gray-800 hover:bg-gray-100"
            }`}
          style={{ fontFamily: "DM Sans, sans-serif" }}
        >
          <Globe className="w-4 h-4 text-purple-600" />
          <span>Website</span>
        </button>

        {/* 4. CHATBOT — leaf, gated */}
        {showChatbotTab && (
          <button
            type="button"
            onClick={() => onTabChange("chatbot")}
            className={`w-full flex items-center gap-2 px-2.5 py-2 rounded-lg transition-colors text-xs font-bold ${activeTab === "chatbot" ? "bg-green-50 text-green-800" : "text-gray-800 hover:bg-gray-100"
              }`}
            style={{ fontFamily: "DM Sans, sans-serif" }}
          >
            <Bot className="w-4 h-4 text-purple-600" />
            <span>Chatbot</span>
          </button>
        )}
      </div>
    </div>
  );
}

