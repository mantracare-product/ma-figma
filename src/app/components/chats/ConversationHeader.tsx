import React from "react";
import { X, Bot, UserCheck, ChevronDown } from "lucide-react";
import { Conversation } from "../../../lib/useConversations";
import { CHANNEL_LABELS, CHANNEL_CLASSES } from "../../../constants/channels";

export interface ConversationHeaderProps {
  conversation: Conversation;
  isDrawer?: boolean;
  onClose?: () => void;
  onToggleBotStatus?: () => void;
  onOpenAssignBotModal?: () => void;
  onOpenAssignPersonModal?: () => void;
  availableEmployees?: Array<{ id: string; name: string }>;
}

export default function ConversationHeader({
  conversation,
  isDrawer,
  onClose,
  onToggleBotStatus,
  onOpenAssignBotModal,
  onOpenAssignPersonModal,
  availableEmployees = [
    { id: "1", name: "Sarah Johnson" },
    { id: "2", name: "Michael Chen" },
    { id: "3", name: "Emily Rodriguez" },
  ],
}: ConversationHeaderProps) {
  const channelKey = conversation.channel || "whatsapp";
  const channelLabel = CHANNEL_LABELS[channelKey] || "WhatsApp";
  const channelClass = CHANNEL_CLASSES[channelKey] || "bg-emerald-100 text-emerald-800 border-emerald-200";

  const initials = conversation.contactName
    ? conversation.contactName.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2)
    : "C";

  const assignedEmployee = availableEmployees.find((e) => e.id === conversation.assignedPersonId);

  return (
    <div className="px-6 py-3.5 border-b border-gray-200 flex items-center justify-between bg-white shrink-0">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold text-sm shrink-0">
          {initials}
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-base font-semibold text-gray-900" style={{ fontFamily: "Outfit, sans-serif" }}>
              {conversation.contactName || "Contact"}
            </h3>
            <span className={`px-2 py-0.5 rounded-full text-xs font-medium border ${channelClass}`}>
              {channelLabel}
            </span>
          </div>
          <p className="text-xs text-gray-500 flex items-center gap-2">
            <span>{conversation.phoneNumber}</span>
            {conversation.channel === "whatsapp" && conversation.inboxNumber && (
              <>
                <span>•</span>
                <span>via {conversation.inboxNumber}</span>
              </>
            )}
          </p>
        </div>
      </div>

      {/* Right side: Status pills & optional Close X */}
      <div className="flex items-center gap-2">
        {/* Status Pill */}
        {conversation.botStatus === "active" ? (
          <button
            type="button"
            onClick={onToggleBotStatus}
            className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full text-xs font-medium hover:bg-emerald-100 transition-colors"
          >
            <Bot className="w-3.5 h-3.5 text-emerald-600" />
            <span>Bot Active</span>
          </button>
        ) : conversation.assignedPersonId ? (
          <button
            type="button"
            onClick={onOpenAssignPersonModal}
            className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-blue-50 text-blue-700 border border-blue-200 rounded-full text-xs font-medium hover:bg-blue-100 transition-colors"
          >
            <UserCheck className="w-3.5 h-3.5 text-blue-600" />
            <span>Assigned to {assignedEmployee?.name || "Team Member"}</span>
          </button>
        ) : (
          <button
            type="button"
            onClick={onOpenAssignBotModal}
            className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-gray-100 text-gray-600 border border-gray-200 rounded-full text-xs font-medium hover:bg-gray-200 transition-colors"
          >
            <Bot className="w-3.5 h-3.5 text-gray-500" />
            <span>Unassigned (Bot Off)</span>
          </button>
        )}

        {isDrawer && onClose && (
          <button
            type="button"
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors ml-1"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>
    </div>
  );
}
