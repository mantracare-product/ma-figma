import React, { useState } from "react";
import {
  ChevronDown,
  ChevronRight,
  Settings,
  Inbox as InboxIcon,
  MessageCircle,
  MessageSquare,
  Globe,
} from "lucide-react";
import { ChannelType, CHANNEL_LABELS } from "../../../constants/channels";

type ViewFilter = "all" | "open" | "resolved" | "unread";

interface InboxNavSidebarProps {
  channelFilter: "all" | ChannelType;
  setChannelFilter: (v: "all" | ChannelType) => void;
  viewFilter: ViewFilter;
  setViewFilter: (v: ViewFilter) => void;
  onOpenSettings: () => void;
  onOpenBroadcasts: () => void;
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
}: {
  icon?: React.ReactNode;
  label: string;
  active?: boolean;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm transition-colors ${
        active
          ? "bg-green-50 text-green-800 font-semibold"
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
  channelFilter,
  setChannelFilter,
  viewFilter,
  setViewFilter,
  onOpenSettings,
  onOpenBroadcasts,
}: InboxNavSidebarProps) {
  const [channelsOpen, setChannelsOpen] = useState(true);

  return (
    <div className="w-[220px] shrink-0 border-r border-gray-200 flex flex-col h-full bg-white">
      {/* Header */}
      <div className="px-4 py-3.5 border-b border-gray-200 flex items-center justify-between">
        <h3
          className="text-sm font-bold text-gray-900"
          style={{ fontFamily: "DM Sans, sans-serif" }}
        >
          Team Inbox
        </h3>
        <button
          type="button"
          onClick={onOpenSettings}
          className="p-1 hover:bg-gray-100 rounded-lg text-gray-400"
          title="Configure channels & bots"
        >
          <Settings className="w-4 h-4" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-2 py-3 space-y-4">
        {/* Channels section */}
        <div>
          <button
            type="button"
            onClick={() => setChannelsOpen((o) => !o)}
            className="w-full flex items-center gap-1 px-1 mb-1 text-[10px] font-bold text-gray-400 uppercase tracking-wider"
          >
            {channelsOpen ? (
              <ChevronDown className="w-3 h-3" />
            ) : (
              <ChevronRight className="w-3 h-3" />
            )}
            Channels
          </button>
          {channelsOpen && (
            <div className="space-y-0.5">
              <NavRow
                icon={<InboxIcon className="w-4 h-4 text-gray-500" />}
                label="All Channels"
                active={channelFilter === "all"}
                onClick={() => setChannelFilter("all")}
              />
              {(["whatsapp", "sms", "website"] as const).map((ch) => (
                <NavRow
                  key={ch}
                  icon={CHANNEL_ICON[ch]}
                  label={CHANNEL_LABELS[ch]}
                  active={channelFilter === ch}
                  onClick={() => setChannelFilter(ch)}
                />
              ))}
            </div>
          )}
        </div>

        {/* Saved views */}
        <div className="space-y-0.5 pt-2 border-t border-gray-100">
          <div className="px-3 mb-1 text-[10px] font-bold text-gray-400 uppercase tracking-wider">
            Views
          </div>
          <NavRow
            label="All chats"
            active={viewFilter === "all"}
            onClick={() => setViewFilter("all")}
          />
          <NavRow
            label="Active chats"
            active={viewFilter === "open"}
            onClick={() => setViewFilter("open")}
          />
          <NavRow
            label="Solved chats"
            active={viewFilter === "resolved"}
            onClick={() => setViewFilter("resolved")}
          />
          <NavRow
            label="Unread chats"
            active={viewFilter === "unread"}
            onClick={() => setViewFilter("unread")}
          />
          <NavRow
            label="Broadcasts"
            onClick={onOpenBroadcasts}
          />
        </div>

        {/* Static "coming soon" note */}
        <div className="px-3 py-2 text-[10px] text-gray-400 italic border-t border-gray-100" style={{ fontFamily: "Outfit, sans-serif" }}>
          More views coming soon
        </div>
      </div>
    </div>
  );
}
