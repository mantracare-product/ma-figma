import React, { useState, useRef, useEffect } from "react";
import { Paperclip, Settings, Send, Clock, AlertTriangle, FileText, UserCheck, ChevronRight, X, Reply, File } from "lucide-react";
import { Conversation, SessionWindowStatus, Message, MessageReplyReference, MessageAttachment } from "../../../lib/useConversations";
import { useWhatsappTemplates } from "../../../lib/useWhatsappTemplates";
import { WhatsappTemplate, Campaign } from "../../pages/Chats";
import { Tooltip } from "../ui/Tooltip";
import { toast } from "sonner";
import AssignResponsibleModal from "./AssignResponsibleModal";

export interface MessageComposerBarProps {
  conversation?: Conversation;
  session: SessionWindowStatus;
  channel?: "all" | "whatsapp" | "sms" | "website" | "email" | "companion" | null;
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
  replyingTo?: Message | null;
  onCancelReply?: () => void;
}

export default function MessageComposerBar({
  conversation,
  session,
  channel,
  onSendMessage,
  onSendTemplate,
  onAssignResponsible,
  replyingTo,
  onCancelReply,
}: MessageComposerBarProps) {
  const [inputText, setInputText] = useState("");
  const [attachedFile, setAttachedFile] = useState<MessageAttachment | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [globalTemplates] = useWhatsappTemplates();
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>("");
  const [showGearMenu, setShowGearMenu] = useState(false);
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const gearMenuRef = useRef<HTMLDivElement>(null);

  // Determine if this is a website conversation (hide More Actions & Settings on website channel)
  const isWebsite = conversation?.channel === "website" || channel === "website";

  const isGroup = Boolean(conversation?.isGroup);
  const isOnlyModeratorsCanPost = isGroup && conversation?.groupConfig?.permissions.whoCanPost === "moderators";
  // Demo assumption: current user is admin/practitioner who is owner/moderator
  const canPost = true;

  const approvedTemplates = globalTemplates.filter((t) => t.approvalStatus === "approved" || !t.approvalStatus);

  useEffect(() => {
    if (approvedTemplates.length > 0 && !selectedTemplateId) {
      setSelectedTemplateId(approvedTemplates[0].id);
    }
  }, [approvedTemplates, selectedTemplateId]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (gearMenuRef.current && !gearMenuRef.current.contains(e.target as Node)) {
        setShowGearMenu(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

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
    setShowGearMenu(false);
  };

  const handleSelectResponsible = (personId: string, personName: string) => {
    if (onAssignResponsible) {
      onAssignResponsible(personId, personName);
    } else if (conversation) {
      try {
        const stored = localStorage.getItem("whatsappMockConversations");
        if (stored) {
          const list: Conversation[] = JSON.parse(stored);
          const updated = list.map((c) =>
            c.id === conversation.id
              ? {
                  ...c,
                  assignedPersonId: personId,
                  botStatus: personId ? ("off" as const) : c.botStatus,
                }
              : c
          );
          localStorage.setItem("whatsappMockConversations", JSON.stringify(updated));
          window.dispatchEvent(new Event("storage"));
          window.dispatchEvent(new CustomEvent("test-conversation-sync"));
        }
      } catch {}
      toast.success(personId ? `Assigned to ${personName}` : "Conversation unassigned");
    }
    setShowAssignModal(false);
  };

  return (
    <div className="p-4 border-t border-gray-200 bg-white shrink-0 relative">
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
          <div className="flex items-center justify-between p-2 px-3 bg-slate-50 border border-slate-200/90 rounded-xl text-xs animate-in fade-in duration-100">
            <div className="flex items-center gap-2 min-w-0">
              <Reply className="w-3.5 h-3.5 text-[#1456f0] shrink-0" />
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
          <div className="flex items-center justify-between p-2 px-3 bg-blue-50/60 border border-blue-200/80 rounded-xl text-xs">
            <div className="flex items-center gap-2 min-w-0">
              <File className="w-3.5 h-3.5 text-[#1456f0] shrink-0" />
              <div className="min-w-0">
                <span className="font-bold text-slate-900 truncate block">{attachedFile.name}</span>
                <span className="text-[10px] text-slate-500 font-mono tabular-nums">{attachedFile.size}</span>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setAttachedFile(null)}
              className="p-1 text-slate-400 hover:text-slate-700 hover:bg-blue-100/60 rounded-md transition-colors cursor-pointer shrink-0"
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
              className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
            >
              <Paperclip className="w-4 h-4" />
            </button>
          </Tooltip>

          {/* Gear Settings Button + Popover (Hidden on Website channel) */}
          {!isWebsite && (
            <div className="relative" ref={gearMenuRef}>
              <Tooltip content="Message Actions & Settings">
                <button
                  type="button"
                  onClick={() => setShowGearMenu((prev) => !prev)}
                  className={`p-2 rounded-xl transition-colors cursor-pointer ${
                    showGearMenu ? "bg-blue-50 text-[#1456f0]" : "text-slate-400 hover:text-slate-700 hover:bg-slate-100"
                  }`}
                >
                  <Settings className="w-4 h-4" />
                </button>
              </Tooltip>

              {/* Settings Dropdown Popover */}
              {showGearMenu && (
                <div className="absolute bottom-10 left-0 z-50 w-56 bg-white border border-border rounded-xl shadow-xl py-1 text-xs animate-in fade-in zoom-in-95 duration-150">
                  <button
                    type="button"
                    onClick={() => {
                      setShowTemplateModal(true);
                      setShowGearMenu(false);
                    }}
                    className="w-full px-3 py-2 text-left hover:bg-slate-50 text-slate-700 flex items-center justify-between transition-colors cursor-pointer"
                  >
                    <span className="flex items-center gap-2 font-medium">
                      <FileText className="w-4 h-4 text-[#1456f0]" />
                      Share Template Message
                    </span>
                    <ChevronRight className="w-3 h-3 text-slate-400" />
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setShowAssignModal(true);
                      setShowGearMenu(false);
                    }}
                    className="w-full px-3 py-2 text-left hover:bg-slate-50 text-slate-700 flex items-center justify-between transition-colors cursor-pointer"
                  >
                    <span className="flex items-center gap-2 font-medium">
                      <UserCheck className="w-4 h-4 text-[#1456f0]" />
                      Assign Responsible
                    </span>
                    <ChevronRight className="w-3 h-3 text-slate-400" />
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Text input */}
          <textarea
            rows={2}
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
                : "Type a message... (Press Enter to send)"
            }
            className="flex-1 text-xs p-2.5 bg-slate-50/60 hover:bg-white focus:bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#1456f0]/15 focus:border-[#1456f0] resize-none text-[#1E293B]"
            style={{ fontFamily: "Outfit, sans-serif" }}
          />

          {/* Send button */}
          <button
            type="button"
            onClick={handleSendText}
            disabled={(!inputText.trim() && !attachedFile) || !canPost}
            className="w-10 h-10 bg-[#1456f0] hover:bg-blue-700 disabled:opacity-40 text-white rounded-xl shadow-xs transition-colors flex items-center justify-center cursor-pointer shrink-0"
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

      {/* Assign Responsible Modal */}
      <AssignResponsibleModal
        isOpen={showAssignModal}
        onClose={() => setShowAssignModal(false)}
        currentAssignedId={conversation?.assignedPersonId}
        contactName={conversation?.contactName}
        onAssign={handleSelectResponsible}
      />
    </div>
  );
}
