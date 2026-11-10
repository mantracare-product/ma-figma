import React from "react";
import { X, Bot, UserCheck, ChevronDown, Users, Settings } from "lucide-react";
import { Conversation } from "../../../lib/useConversations";
import { CHANNEL_LABELS, CHANNEL_CLASSES } from "../../../constants/channels";

export interface ConversationHeaderProps {
  conversation: Conversation;
  channel?: string;
  isDrawer?: boolean;
  onClose?: () => void;
  onToggleBotStatus?: () => void;
  onOpenAssignBotModal?: () => void;
  onOpenAssignPersonModal?: () => void;
  onOpenGroupSettings?: () => void;
  availableEmployees?: Array<{ id: string; name: string }>;
}

export default function ConversationHeader({
  conversation,
  channel,
  isDrawer,
  onClose,
  onToggleBotStatus,
  onOpenAssignBotModal,
  onOpenAssignPersonModal,
  onOpenGroupSettings,
  availableEmployees = [
    { id: "1", name: "Sarah Johnson" },
    { id: "2", name: "Michael Chen" },
    { id: "3", name: "Emily Rodriguez" },
  ],
}: ConversationHeaderProps) {
  const channelKey = conversation.channel || channel || "whatsapp";
  const channelLabel = CHANNEL_LABELS[channelKey] || "WhatsApp";

  const isCompanion =
    conversation.channel === "companion" ||
    conversation.id === "care-bot-system" ||
    channel === "companion";

  const initials = conversation.contactName
    ? conversation.contactName.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2)
    : "C";

  const assignedEmployee = availableEmployees.find((e) => e.id === conversation.assignedPersonId);

  return (
    <div className="px-5 py-3 border-b border-gray-200/90 flex items-center justify-between bg-white shrink-0">
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl bg-[#1E293B] text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-2xs">
          {conversation.isGroup ? <Users className="w-4 h-4" /> : initials}
        </div>
        <div>
          <h3 className="text-sm font-bold text-[#1E293B]" style={{ fontFamily: "Outfit, sans-serif" }}>
            {conversation.contactName || "Contact"}
          </h3>
          <p className="text-xs text-[#64748b] font-mono tabular-nums">
            {conversation.phoneNumber}
          </p>
        </div>
      </div>

      {/* Right side: Actions & Group Settings */}
      <div className="flex items-center gap-2">
        {conversation.isGroup ? (
          onOpenGroupSettings && (
            <button
              type="button"
              onClick={onOpenGroupSettings}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
            >
              <Settings className="w-3.5 h-3.5 text-slate-500" />
              <span>Group Settings</span>
            </button>
          )
        ) : !isCompanion ? (
          <>
            {conversation.botStatus === "active" ? (
              <button
                type="button"
                onClick={onToggleBotStatus}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 text-slate-700 text-xs font-semibold hover:bg-slate-50 transition-colors cursor-pointer"
              >
                <span className="w-1.5 h-1.5 rounded-full bg-[#10b981]" />
                <Bot className="w-3.5 h-3.5 text-slate-600" />
                <span>Bot Active</span>
              </button>
            ) : conversation.assignedPersonId ? (
              <button
                type="button"
                onClick={onOpenAssignPersonModal}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 text-slate-700 text-xs font-semibold hover:bg-slate-50 transition-colors cursor-pointer"
              >
                <UserCheck className="w-3.5 h-3.5 text-slate-600" />
                <span>Assigned: {assignedEmployee?.name || "Team Member"}</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={onOpenAssignBotModal}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 text-slate-500 text-xs font-semibold hover:bg-slate-50 transition-colors cursor-pointer"
              >
                <Bot className="w-3.5 h-3.5 text-slate-400" />
                <span>Unassigned</span>
              </button>
            )}
          </>
        ) : null}

        {isDrawer && onClose && (
          <button
            type="button"
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors ml-1 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>
    </div>
  );
}
