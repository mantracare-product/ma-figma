import React, { useState, useRef, useEffect } from "react";
import {
  Paperclip,
  Send,
  FileText,
  X,
  Reply,
  File,
} from "lucide-react";
import { Conversation, SessionWindowStatus, Message, MessageReplyReference, MessageAttachment } from "../../../lib/useConversations";
import { useWhatsappTemplates } from "../../../lib/useWhatsappTemplates";
import { WhatsappTemplate, Campaign } from "../../pages/Chats";
import { Tooltip } from "../ui/Tooltip";
import { toast } from "sonner";

export interface MessageComposerBarProps {
  conversation?: Conversation;
  session: SessionWindowStatus;
  channel?: "all" | "whatsapp" | "sms" | "website" | "email" | "companion" | "team" | null;
  onSendMessage: (
    text: string,
    options?: {
      replyTo?: MessageReplyReference;
      attachment?: MessageAttachment;
    }
  ) => void;
  onSendTemplate: (template: WhatsappTemplate) => void;
  onEnrollCampaign?: (campaign: Campaign) => void;
  onAssignResponsible?: (personId: string, personName: string) => void;
  onToggleBotStatus?: () => void;
  replyingTo?: Message | null;
  onCancelReply?: () => void;
}

const AVATAR_COLORS = [
  "bg-blue-600 text-white",
  "bg-emerald-600 text-white",
  "bg-purple-600 text-white",
  "bg-indigo-600 text-white",
  "bg-amber-600 text-white",
  "bg-rose-600 text-white",
  "bg-teal-600 text-white",
  "bg-cyan-600 text-white",
];

function getInitials(name: string): string {
  if (!name) return "U";
  const parts = name.trim().split(" ");
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function getAvatarColor(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % AVATAR_COLORS.length;
  return AVATAR_COLORS[index];
}

export default function MessageComposerBar({
  conversation,
  session,
  channel,
  onSendMessage,
  onSendTemplate,
  onAssignResponsible,
  onToggleBotStatus,
  replyingTo,
  onCancelReply,
}: MessageComposerBarProps) {
  const [inputText, setInputText] = useState("");
  const [attachedFile, setAttachedFile] = useState<MessageAttachment | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [globalTemplates] = useWhatsappTemplates();
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>("");
  const [showTemplateModal, setShowTemplateModal] = useState(false);

  // Determine if this is a website conversation
  const isWebsite = conversation?.channel === "website" || channel === "website";

  // Determine if this is an internal team conversation
  const isTeam = conversation?.channel === "team" || channel === "team" || Boolean(conversation?.isTeam);

  // Determine if this is a Companion conversation
  const isCompanion = conversation?.channel === "companion" || conversation?.id === "care-bot-system" || channel === "companion";
  const isWhatsApp = (conversation?.channel === "whatsapp" || channel === "whatsapp") && !isWebsite && !isTeam && !isCompanion;

  const isGroup = Boolean(conversation?.isGroup);
  // Demo assumption: current user is admin/practitioner who is owner/moderator
  const canPost = true;

  const approvedTemplates = globalTemplates.filter((t) => t.approvalStatus === "approved" || !t.approvalStatus);

  useEffect(() => {
    if (approvedTemplates.length > 0 && !selectedTemplateId) {
      setSelectedTemplateId(approvedTemplates[0].id);
    }
  }, [approvedTemplates, selectedTemplateId]);

  const handleSendText = () => {
    if (!inputText.trim() && !attachedFile) return;

    const replyRef: MessageReplyReference | undefined = replyingTo
      ? {
          id: replyingTo.id,
          text: replyingTo.text,
          senderName: replyingTo.senderName || (replyingTo.sender === "me" ? "Me" : conversation?.contactName || "Contact"),
        }
      : undefined;

    onSendMessage(inputText.trim(), {
      replyTo: replyRef,
      attachment: attachedFile || undefined,
    });

    setInputText("");
    setAttachedFile(null);
    if (onCancelReply) onCancelReply();
  };

  const handleFileSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const sizeStr = file.size > 1024 * 1024
        ? `${(file.size / (1024 * 1024)).toFixed(1)} MB`
        : `${Math.round(file.size / 1024)} KB`;
      setAttachedFile({
        name: file.name,
        size: sizeStr,
        type: file.type || "application/octet-stream",
      });
      toast.success(`Attached "${file.name}"`);
    }
  };

  const handleSendTemplateFromModal = (tpl: WhatsappTemplate) => {
    onSendTemplate(tpl);
    setShowTemplateModal(false);
  };

  return (
    <div
      className={`shrink-0 relative ${
        isWhatsApp
          ? "px-4 py-2.5 border-t border-[#e9edef] bg-[#f0f2f5]"
          : "p-4 border-t border-gray-200 bg-white"
      }`}
    >
      {/* Hidden File Input */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileSelected}
        className="hidden"
      />

      {/* Active Composer */}
      <div className="space-y-2">
        {/* Reply Quote Strip */}
        {replyingTo && (
          <div
            className={`flex items-center justify-between p-2 px-3 text-xs animate-in fade-in duration-100 ${
              isWhatsApp
                ? "bg-white border-l-4 border-[#00a884] rounded-lg shadow-2xs"
                : "bg-slate-50 border border-slate-200/90 rounded-xl"
            }`}
          >
            <div className="flex items-center gap-2 min-w-0">
              <Reply className={`w-3.5 h-3.5 shrink-0 ${isWhatsApp ? "text-[#00a884]" : "text-[#1456f0]"}`} />
              <div className="min-w-0">
                <span className="font-bold text-slate-800">
                  Replying to {replyingTo.senderName || (replyingTo.sender === "me" ? "Me" : conversation?.contactName || "Contact")}:
                </span>{" "}
                <span className="text-slate-500 truncate italic">"{replyingTo.text}"</span>
              </div>
            </div>
            {onCancelReply && (
              <button
                type="button"
                onClick={onCancelReply}
                className="p-1 text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 rounded-md transition-colors cursor-pointer shrink-0"
                title="Cancel reply"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        )}

        {/* Attached File Preview Chip */}
        {attachedFile && (
          <div
            className={`flex items-center justify-between p-2 px-3 text-xs ${
              isWhatsApp
                ? "bg-white border border-[#bbf7d0] rounded-lg"
                : "bg-blue-50/60 border border-blue-200/80 rounded-xl"
            }`}
          >
            <div className="flex items-center gap-2 min-w-0">
              <File className={`w-3.5 h-3.5 shrink-0 ${isWhatsApp ? "text-[#00a884]" : "text-[#1456f0]"}`} />
              <div className="min-w-0">
                <span className="font-bold text-slate-900 truncate block">{attachedFile.name}</span>
                <span className="text-[10px] text-slate-500 font-mono tabular-nums">{attachedFile.size}</span>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setAttachedFile(null)}
              className="p-1 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-md transition-colors cursor-pointer shrink-0"
              title="Remove attachment"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        <div className="flex items-center gap-2">
          {/* Attachment Button */}
          <Tooltip content="Attach File or Document">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className={`p-2 transition-colors cursor-pointer ${
                isWhatsApp
                  ? "text-[#54656f] hover:text-[#111b21] hover:bg-black/5 rounded-full"
                  : "text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl"
              }`}
            >
              <Paperclip className="w-4 h-4" />
            </button>
          </Tooltip>

          {/* Text input */}
          <textarea
            rows={isWhatsApp ? 1 : 2}
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            disabled={!canPost}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSendText();
              }
            }}
            placeholder={
              !canPost
                ? "Only moderators can post in this group"
                : isWhatsApp
                ? "Type a message..."
                : "Type a message... (Press Enter to send)"
            }
            className={
              isWhatsApp
                ? "flex-1 text-sm py-2.5 px-4 bg-white border border-transparent focus:border-[#00a884]/40 rounded-full focus:outline-none resize-none text-[#111b21] placeholder:text-[#667781]"
                : "flex-1 text-xs p-2.5 bg-slate-50/60 hover:bg-white focus:bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#1456f0]/15 focus:border-[#1456f0] resize-none text-[#1E293B]"
            }
            style={{ fontFamily: "Outfit, sans-serif" }}
          />

          {/* Quick Use Template pill for WhatsApp */}
          {isWhatsApp && (
            <button
              type="button"
              onClick={() => setShowTemplateModal(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full bg-[#e7fce3] hover:bg-[#d9fdd3] text-[#008069] border border-[#bbf7d0] text-xs font-semibold transition-colors cursor-pointer shrink-0"
            >
              <FileText className="w-3.5 h-3.5" />
              <span>Use template</span>
            </button>
          )}

          {/* Send button */}
          <button
            type="button"
            onClick={handleSendText}
            disabled={(!inputText.trim() && !attachedFile) || !canPost}
            className={
              isWhatsApp
                ? "w-10 h-10 bg-[#00a884] hover:bg-[#008f72] disabled:opacity-45 text-white rounded-full shadow-xs transition-colors flex items-center justify-center cursor-pointer shrink-0"
                : "w-10 h-10 bg-[#1456f0] hover:bg-blue-700 disabled:opacity-40 text-white rounded-xl shadow-xs transition-colors flex items-center justify-center cursor-pointer shrink-0"
            }
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Share Template Modal */}
      {showTemplateModal && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <h3 className="text-base font-bold text-gray-900" style={{ fontFamily: "Outfit, sans-serif" }}>
              Share Approved Template Message
            </h3>
            <p className="text-xs text-gray-500">
              Select an approved template to send to this contact.
            </p>
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {approvedTemplates.map((tpl) => (
                <div
                  key={tpl.id}
                  onClick={() => handleSendTemplateFromModal(tpl)}
                  className="p-3 border border-gray-200 rounded-xl hover:border-blue-500 hover:bg-blue-50/50 cursor-pointer transition-all space-y-1 text-xs"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-gray-900">{tpl.name}</span>
                    <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-[10px] rounded-full font-medium">
                      {tpl.category}
                    </span>
                  </div>
                  <p className="text-gray-600 line-clamp-2">{tpl.bodyText}</p>
                </div>
              ))}
            </div>
            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={() => setShowTemplateModal(false)}
                className="px-4 py-2 text-xs font-medium text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
