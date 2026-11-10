import React, { useState, useRef, useEffect, useMemo } from "react";
import {
  Paperclip,
  Settings,
  Send,
  Clock,
  AlertTriangle,
  FileText,
  UserCheck,
  ChevronRight,
  ChevronLeft,
  X,
  Reply,
  File,
  PauseCircle,
  PlayCircle,
  UserX,
  Check,
  Search,
} from "lucide-react";
import { Conversation, SessionWindowStatus, Message, MessageReplyReference, MessageAttachment } from "../../../lib/useConversations";
import { useWhatsappTemplates } from "../../../lib/useWhatsappTemplates";
import { WhatsappTemplate, Campaign } from "../../pages/Chats";
import { Tooltip } from "../ui/Tooltip";
import { toast } from "sonner";
import AssignResponsibleModal from "./AssignResponsibleModal";
import { getStoredTeamMembers, TeamMember } from "../../../lib/teamStore";

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
  const [showGearMenu, setShowGearMenu] = useState(false);
  const [gearView, setGearView] = useState<"menu" | "assign">("menu");
  const [memberSearchQuery, setMemberSearchQuery] = useState("");
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const gearMenuRef = useRef<HTMLDivElement>(null);

  // Determine if this is a website conversation (hide More Actions & Settings on website channel)
  const isWebsite = conversation?.channel === "website" || channel === "website";

  // Determine if this is a Companion conversation
  const isCompanion = conversation?.channel === "companion" || conversation?.id === "care-bot-system" || channel === "companion";
  const isBotActive = conversation?.botStatus === "active";

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

  // Load organization team members when gear menu opens
  useEffect(() => {
    if (showGearMenu) {
      try {
        const stored = getStoredTeamMembers();
        if (Array.isArray(stored) && stored.length > 0) {
          setTeamMembers(stored.filter((m) => m && m.name && m.status !== false));
        }
      } catch {}
    } else {
      setGearView("menu");
      setMemberSearchQuery("");
    }
  }, [showGearMenu]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (gearMenuRef.current && !gearMenuRef.current.contains(e.target as Node)) {
        setShowGearMenu(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const filteredTeamMembers = useMemo(() => {
    const q = memberSearchQuery.trim().toLowerCase();
    if (!q) return teamMembers;
    return teamMembers.filter((m) =>
      m.name.toLowerCase().includes(q) ||
      (m.role && m.role.toLowerCase().includes(q)) ||
      (m.department && m.department.toLowerCase().includes(q))
    );
  }, [teamMembers, memberSearchQuery]);

  const assignedMember = useMemo(() => {
    if (!conversation?.assignedPersonId) return null;
    return teamMembers.find((m) => String(m.id) === String(conversation.assignedPersonId));
  }, [teamMembers, conversation?.assignedPersonId]);

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

  const handleToggleCareBot = () => {
    if (onToggleBotStatus) {
      onToggleBotStatus();
    } else if (conversation) {
      const nextStatus = isBotActive ? "off" : "active";
      try {
        const stored = localStorage.getItem("whatsappMockConversations");
        if (stored) {
          const list: Conversation[] = JSON.parse(stored);
          const updated = list.map((c) =>
            c.id === conversation.id
              ? {
                  ...c,
                  botStatus: nextStatus,
                  assignedPersonId: nextStatus === "active" ? null : c.assignedPersonId,
                }
              : c
          );
          localStorage.setItem("whatsappMockConversations", JSON.stringify(updated));
          window.dispatchEvent(new Event("storage"));
          window.dispatchEvent(new CustomEvent("test-conversation-sync"));
        }
      } catch {}
      toast.success(isBotActive ? "Care Bot paused" : "Care Bot active");
    }
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
                  assignedPersonId: personId || null,
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
    setShowGearMenu(false);
    setGearView("menu");
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

              {/* Settings Dropdown Popover (Positioned cleanly above the gear box) */}
              {showGearMenu && (
                <div
                  className="absolute bottom-11 left-0 z-50 bg-white border border-slate-200/90 rounded-2xl shadow-xl text-xs animate-in fade-in zoom-in-95 duration-150 overflow-hidden"
                  style={{ width: isCompanion && gearView === "assign" ? "272px" : "240px" }}
                >
                  {isCompanion ? (
                    gearView === "menu" ? (
                      /* Companion Gear Menu: Pause Care Bot + Assign Responsible (No templates) */
                      <div className="py-1">
                        {/* 1. Pause / Resume Care Bot */}
                        <button
                          type="button"
                          onClick={handleToggleCareBot}
                          className="w-full px-3.5 py-2.5 text-left hover:bg-slate-50 text-slate-700 flex items-center justify-between transition-colors cursor-pointer"
                        >
                          <span className="flex items-center gap-2.5 font-medium">
                            {isBotActive ? (
                              <>
                                <PauseCircle className="w-4 h-4 text-amber-500 shrink-0" />
                                <span>Pause Care Bot</span>
                              </>
                            ) : (
                              <>
                                <PlayCircle className="w-4 h-4 text-emerald-500 shrink-0" />
                                <span>Resume Care Bot</span>
                              </>
                            )}
                          </span>
                          <span
                            className={`text-[10px] font-mono px-1.5 py-0.5 rounded-full ${
                              isBotActive
                                ? "bg-emerald-50 text-emerald-600 font-semibold"
                                : "bg-slate-100 text-slate-500"
                            }`}
                          >
                            {isBotActive ? "Active" : "Paused"}
                          </span>
                        </button>

                        {/* 2. Assign Responsible (Only Organization Team Members) */}
                        <button
                          type="button"
                          onClick={() => setGearView("assign")}
                          className="w-full px-3.5 py-2.5 text-left hover:bg-slate-50 text-slate-700 flex items-center justify-between transition-colors cursor-pointer border-t border-slate-100"
                        >
                          <span className="flex items-center gap-2.5 font-medium">
                            <UserCheck className="w-4 h-4 text-[#1456f0] shrink-0" />
                            <span>Assign Responsible</span>
                          </span>
                          <div className="flex items-center gap-1 text-slate-400">
                            {assignedMember && (
                              <span className="text-[10px] text-blue-600 max-w-[70px] truncate font-medium">
                                {assignedMember.name}
                              </span>
                            )}
                            <ChevronRight className="w-3.5 h-3.5" />
                          </div>
                        </button>
                      </div>
                    ) : (
                      /* Clean, Small, Concise Assign Responsible Popup Above Gear Box */
                      <div className="p-2 space-y-2">
                        {/* Header */}
                        <div className="flex items-center justify-between pb-1.5 border-b border-slate-100 px-1">
                          <button
                            type="button"
                            onClick={() => setGearView("menu")}
                            className="flex items-center gap-1 text-[11px] font-semibold text-slate-500 hover:text-slate-800 cursor-pointer"
                          >
                            <ChevronLeft className="w-3.5 h-3.5" />
                            <span>Back</span>
                          </button>
                          <span className="text-[11px] font-bold text-slate-700 tracking-tight">
                            Assign Responsible
                          </span>
                          <button
                            type="button"
                            onClick={() => {
                              setShowGearMenu(false);
                              setGearView("menu");
                            }}
                            className="p-1 text-slate-400 hover:text-slate-600 rounded cursor-pointer"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>

                        {/* Search Input */}
                        <div className="relative px-0.5">
                          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2" />
                          <input
                            type="text"
                            autoFocus
                            value={memberSearchQuery}
                            onChange={(e) => setMemberSearchQuery(e.target.value)}
                            placeholder="Filter team member..."
                            className="w-full pl-8 pr-2.5 py-1 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 focus:bg-white"
                          />
                        </div>

                        {/* Team Members List (Only Organization Team Members) */}
                        <div className="max-h-48 overflow-y-auto space-y-0.5 px-0.5">
                          {/* Unassigned Option */}
                          <button
                            type="button"
                            onClick={() => handleSelectResponsible("", "Unassigned")}
                            className={`w-full px-2 py-1.5 rounded-lg flex items-center justify-between text-left transition-colors cursor-pointer ${
                              !conversation?.assignedPersonId
                                ? "bg-blue-50/70 text-[#1456f0] font-semibold"
                                : "text-slate-600 hover:bg-slate-50"
                            }`}
                          >
                            <div className="flex items-center gap-2 min-w-0">
                              <div className="w-6 h-6 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center shrink-0">
                                <UserX className="w-3 h-3" />
                              </div>
                              <span className="text-xs">Unassigned</span>
                            </div>
                            {!conversation?.assignedPersonId && (
                              <Check className="w-3.5 h-3.5 text-[#1456f0] shrink-0" />
                            )}
                          </button>

                          {filteredTeamMembers.map((member) => {
                            const isAssigned = String(conversation?.assignedPersonId) === String(member.id);
                            return (
                              <button
                                key={member.id}
                                type="button"
                                onClick={() => handleSelectResponsible(String(member.id), member.name)}
                                className={`w-full px-2 py-1.5 rounded-lg flex items-center justify-between text-left transition-colors cursor-pointer ${
                                  isAssigned
                                    ? "bg-blue-50/70 text-[#1456f0] font-semibold"
                                    : "text-slate-800 hover:bg-slate-50"
                                }`}
                              >
                                <div className="flex items-center gap-2 min-w-0">
                                  <div
                                    className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 ${getAvatarColor(
                                      member.name
                                    )}`}
                                  >
                                    {getInitials(member.name)}
                                  </div>
                                  <div className="min-w-0">
                                    <p className="text-xs font-medium truncate leading-tight">{member.name}</p>
                                    <p className="text-[10px] text-slate-400 truncate leading-tight">
                                      {member.role || "Team Member"}
                                    </p>
                                  </div>
                                </div>
                                {isAssigned && (
                                  <Check className="w-3.5 h-3.5 text-[#1456f0] shrink-0" />
                                )}
                              </button>
                            );
                          })}

                          {filteredTeamMembers.length === 0 && (
                            <p className="text-[11px] text-slate-400 text-center py-3">
                              No team members match "{memberSearchQuery}"
                            </p>
                          )}
                        </div>
                      </div>
                    )
                  ) : (
                    /* Other channels: WhatsApp, SMS (Templates + Assign) */
                    <div className="py-1">
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
