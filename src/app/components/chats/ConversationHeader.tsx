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
    <div className="px-5 py-3 border-b border-gray-200/90 flex items-center justify-between bg-white shrink-0">
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl bg-[#1E293B] text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-2xs">
          {initials}
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

      {/* Right side: Status pills & optional Close X */}
      <div className="flex items-center gap-2">
        {/* Status Pill */}
        {conversation.botStatus === "active" ? (
          <button
            type="button"
            onClick={onToggleBotStatus}
            className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-[#ecfdf5] text-[#047857] border border-emerald-200/60 rounded-full text-xs font-semibold hover:bg-emerald-100/70 transition-colors cursor-pointer"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-[#10b981] animate-pulse" />
            <Bot className="w-3.5 h-3.5 text-[#047857]" />
            <span>Bot Active</span>
          </button>
        ) : conversation.assignedPersonId ? (
          <button
            type="button"
            onClick={onOpenAssignPersonModal}
            className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-blue-50 text-[#1456f0] border border-blue-200/60 rounded-full text-xs font-semibold hover:bg-blue-100 transition-colors cursor-pointer"
          >
            <UserCheck className="w-3.5 h-3.5 text-[#1456f0]" />
            <span>Assigned to {assignedEmployee?.name || "Team Member"}</span>
          </button>
        ) : (
          <button
            type="button"
            onClick={onOpenAssignBotModal}
            className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-slate-50 text-slate-600 border border-slate-200/80 rounded-full text-xs font-semibold hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <Bot className="w-3.5 h-3.5 text-slate-500" />
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
