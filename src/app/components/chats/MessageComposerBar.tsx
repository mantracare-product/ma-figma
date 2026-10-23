import React, { useState, useRef, useEffect } from "react";
import { Paperclip, Settings, Send, Clock, AlertTriangle, FileText, UserCheck, ChevronRight } from "lucide-react";
import { Conversation, SessionWindowStatus } from "../../../lib/useConversations";
import { useWhatsappTemplates } from "../../../lib/useWhatsappTemplates";
import { WhatsappTemplate, Campaign } from "../../pages/Chats";
import { toast } from "sonner";
import AssignResponsibleModal from "./AssignResponsibleModal";

export interface MessageComposerBarProps {
  conversation?: Conversation;
  session: SessionWindowStatus;
  onSendMessage: (text: string) => void;
  onSendTemplate: (template: WhatsappTemplate) => void;
  onEnrollCampaign?: (campaign: Campaign) => void;
  onAssignResponsible?: (personId: string, personName: string) => void;
}

export default function MessageComposerBar({
  conversation,
  session,
  onSendMessage,
  onSendTemplate,
  onAssignResponsible,
}: MessageComposerBarProps) {
  const [inputText, setInputText] = useState("");
  const [globalTemplates] = useWhatsappTemplates();
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>("");
  const [showGearMenu, setShowGearMenu] = useState(false);
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const gearMenuRef = useRef<HTMLDivElement>(null);

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
    if (!inputText.trim()) return;
    onSendMessage(inputText.trim());
    setInputText("");
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

  const remainingHours = session.hoursRemaining ?? 24;
  const h = Math.floor(remainingHours);
  const m = Math.round((remainingHours - h) * 60);

  return (
    <div className="p-4 border-t border-gray-200 bg-white shrink-0 relative">
      {/* Active Composer */}
      <div className="space-y-2">
        <div className="flex items-center gap-2">
            {/* Attachment Button */}
            <button
              type="button"
              onClick={() => toast.info("Attachment picker opened")}
              className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
              title="Attach File"
            >
              <Paperclip className="w-4 h-4" />
            </button>

            {/* Gear Settings Button + Popover */}
            <div className="relative" ref={gearMenuRef}>
              <button
                type="button"
                onClick={() => setShowGearMenu((prev) => !prev)}
                className={`p-2 rounded-xl transition-colors cursor-pointer ${
                  showGearMenu ? "bg-blue-50 text-[#1456f0]" : "text-slate-400 hover:text-slate-700 hover:bg-slate-100"
                }`}
                title="Message Actions & Settings"
              >
                <Settings className="w-4 h-4" />
              </button>

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

            {/* Text input */}
            <textarea
              rows={2}
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSendText();
                }
              }}
              placeholder={`Type a message... (Press Enter to send)`}
              className="flex-1 text-xs p-2.5 bg-slate-50/60 hover:bg-white focus:bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#1456f0]/15 focus:border-[#1456f0] resize-none text-[#1E293B]"
              style={{ fontFamily: "Outfit, sans-serif" }}
            />

            {/* Send button */}
            <button
              type="button"
              onClick={handleSendText}
              disabled={!inputText.trim()}
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
