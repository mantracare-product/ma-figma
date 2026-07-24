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
  Filter,
  CheckCircle2,
  Clock,
  Zap,
  Tag,
  Layers,
  Settings
} from "lucide-react";
import { ChannelType, CHANNEL_LABELS } from "../../../constants/channels";

export type TabKey = "chats" | "campaigns" | "templates" | "chatbot";

interface ChatsNavSidebarProps {
  activeTab: TabKey;
  onTabChange: (tab: TabKey) => void;
  // Inbox sub-filters
  channelFilter: "all" | ChannelType | null;
  setChannelFilter: (v: "all" | ChannelType) => void;
}

const CHANNEL_ICON: Record<ChannelType, React.ReactNode> = {
  whatsapp: <MessageCircle className="w-4 h-4 text-[#25D366]" />,
  sms: <MessageSquare className="w-4 h-4 text-blue-600" />,
  website: <Globe className="w-4 h-4 text-purple-600" />,
};

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
      className={`w-full flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs transition-colors ${
        isSubItem ? "pl-7" : ""
      } ${
        active
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
}: ChatsNavSidebarProps) {
  const [collapsed, setCollapsed] = useState<boolean>(() => {
    try {
      return sessionStorage.getItem("chats_sidebar_collapsed") === "true";
    } catch {
      return false;
    }
  });

  const [inboxExpanded, setInboxExpanded] = useState<boolean>(true);

  const toggleCollapsed = () => {
    setCollapsed(prev => {
      const next = !prev;
      try {
        sessionStorage.setItem("chats_sidebar_collapsed", String(next));
      } catch {}
      return next;
    });
  };

  const handleTopLevelClick = (tab: TabKey) => {
    onTabChange(tab);
    if (tab === "chats") setChannelFilter("all");
  };

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
          <button
            type="button"
            onClick={toggleCollapsed}
            className={`p-2.5 rounded-lg transition-colors relative ${
              activeTab === "chats" ? "bg-green-50 text-green-800" : "text-gray-600 hover:bg-gray-100"
            }`}
            title="Inbox — expand sidebar to pick a channel"
          >
            <InboxIcon className="w-5 h-5" />
          </button>

          <button
            type="button"
            onClick={() => handleTopLevelClick("campaigns")}
            className={`p-2.5 rounded-lg transition-colors relative ${
              activeTab === "campaigns" ? "bg-green-50 text-green-800" : "text-gray-600 hover:bg-gray-100"
            }`}
            title="Campaigns"
          >
            <BarChart2 className="w-5 h-5" />
          </button>

          <button
            type="button"
            onClick={() => handleTopLevelClick("templates")}
            className={`p-2.5 rounded-lg transition-colors relative ${
              activeTab === "templates" ? "bg-green-50 text-green-800" : "text-gray-600 hover:bg-gray-100"
            }`}
            title="Template Builder"
          >
            <FileText className="w-5 h-5" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="w-[220px] shrink-0 border-r border-gray-200 flex flex-col h-full bg-white select-none">
      {/* Header */}
      <div className="px-4 py-3.5 border-b border-gray-200 flex items-center justify-between">
        <h3
          className="text-sm font-bold text-gray-900"
          style={{ fontFamily: "DM Sans, sans-serif" }}
        >
          Navigation
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
        {/* 1. INBOX */}
        <div>
          <div
            onClick={() => setInboxExpanded(prev => !prev)}
            className={`w-full flex items-center justify-between px-2.5 py-2 rounded-lg cursor-pointer transition-colors ${
              activeTab === "chats" ? "bg-green-50 text-green-800 font-semibold" : "text-gray-800 hover:bg-gray-100"
            }`}
          >
            <div className="flex items-center gap-2 text-xs font-bold" style={{ fontFamily: "DM Sans, sans-serif" }}>
              <InboxIcon className="w-4 h-4 text-green-700" />
              <span>Inbox</span>
            </div>
            {inboxExpanded ? <ChevronDown className="w-3.5 h-3.5 text-gray-500" /> : <ChevronRight className="w-3.5 h-3.5 text-gray-500" />}
          </div>

          {inboxExpanded && (
            <div className="mt-1 space-y-0.5">
              {(["whatsapp", "sms", "website"] as const).map((ch) => (
                <NavRow
                  key={ch}
                  icon={CHANNEL_ICON[ch]}
                  label={CHANNEL_LABELS[ch]}
                  active={activeTab === "chats" && channelFilter === ch}
                  onClick={() => { onTabChange("chats"); setChannelFilter(ch); }}
                  isSubItem
                />
              ))}
            </div>
          )}
        </div>

        {/* 2. CAMPAIGNS */}
        <button
          type="button"
          onClick={() => handleTopLevelClick("campaigns")}
          className={`w-full flex items-center gap-2 px-2.5 py-2 rounded-lg transition-colors text-xs font-bold ${
            activeTab === "campaigns" ? "bg-green-50 text-green-800" : "text-gray-800 hover:bg-gray-100"
          }`}
          style={{ fontFamily: "DM Sans, sans-serif" }}
        >
          <BarChart2 className="w-4 h-4 text-blue-600" />
          <span>Campaigns</span>
        </button>

        {/* 3. TEMPLATES */}
        <button
          type="button"
          onClick={() => handleTopLevelClick("templates")}
          className={`w-full flex items-center gap-2 px-2.5 py-2 rounded-lg transition-colors text-xs font-bold ${
            activeTab === "templates" ? "bg-green-50 text-green-800" : "text-gray-800 hover:bg-gray-100"
          }`}
          style={{ fontFamily: "DM Sans, sans-serif" }}
        >
          <FileText className="w-4 h-4 text-indigo-600" />
          <span>Templates</span>
        </button>
      </div>
    </div>
  );
}
