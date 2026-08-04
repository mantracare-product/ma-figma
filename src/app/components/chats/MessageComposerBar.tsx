import React, { useState, useRef, useEffect } from "react";
import { Paperclip, Settings, Send, Clock, AlertTriangle, FileText, Zap, ChevronRight } from "lucide-react";
import { Conversation, SessionWindowStatus } from "../../../lib/useConversations";
import { useWhatsappTemplates } from "../../../lib/useWhatsappTemplates";
import { WhatsappTemplate, Campaign } from "../../pages/Chats";
import { toast } from "sonner";

export interface MessageComposerBarProps {
  conversation?: Conversation;
  session: SessionWindowStatus;
  onSendMessage: (text: string) => void;
  onSendTemplate: (template: WhatsappTemplate) => void;
  onEnrollCampaign?: (campaign: Campaign) => void;
}

const MOCK_CAMPAIGNS: Campaign[] = [
  {
    id: "camp-1",
    name: "Patient Intake Onboarding",
    status: "active",
    audience: "New Patients",
    sent: 142,
    delivered: 139,
    opened: 110,
    clicked: 85,
    createdAt: "2026-07-15",
    nodes: [
      { id: "node-1", type: "message", label: "Welcome Message", content: "Hi! Welcome to Mantra Health onboarding." },
    ],
  },
  {
    id: "camp-2",
    name: "Post-Visit Follow-Up",
    status: "active",
    audience: "Completed Visits",
    sent: 88,
    delivered: 87,
    opened: 75,
    clicked: 60,
    createdAt: "2026-07-20",
    nodes: [
      { id: "node-2", type: "message", label: "Feedback Request", content: "Hope your visit went well! How would you rate your care today?" },
    ],
  },
];

export default function MessageComposerBar({
  conversation,
  session,
  onSendMessage,
  onSendTemplate,
  onEnrollCampaign,
}: MessageComposerBarProps) {
  const [inputText, setInputText] = useState("");
  const [globalTemplates] = useWhatsappTemplates();
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>("");
  const [showGearMenu, setShowGearMenu] = useState(false);
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [showCampaignModal, setShowCampaignModal] = useState(false);
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

  const handleEnrollCampaignFromModal = (camp: Campaign) => {
    if (onEnrollCampaign) {
      onEnrollCampaign(camp);
    } else {
      const stepText = camp.nodes[0]?.content || `Enrolled in campaign "${camp.name}"`;
      onSendMessage(stepText);
      toast.success(`Enrolled in campaign "${camp.name}"`);
    }
    setShowCampaignModal(false);
    setShowGearMenu(false);
  };

  const remainingHours = session.hoursRemaining ?? 24;
  const h = Math.floor(remainingHours);
  const m = Math.round((remainingHours - h) * 60);

  return (
    <div className="p-4 border-t border-gray-200 bg-white shrink-0 relative">
      {session.channel === "whatsapp" && !session.freeFormAllowed ? (
        /* Expired Session Composer */
        <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl space-y-3">
          <div className="flex items-center gap-2 text-amber-800 text-xs font-semibold">
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
            <span>Session expired — template message required</span>
          </div>
          <p className="text-xs text-amber-700 leading-relaxed">
            You can only send an approved template until this contact messages you again.
          </p>
          <div className="flex items-center gap-2">
            <select
              value={selectedTemplateId}
              onChange={(e) => setSelectedTemplateId(e.target.value)}
              className="flex-1 text-xs px-3 py-2 bg-white border border-amber-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500/20"
            >
              {approvedTemplates.length === 0 ? (
                <option value="">No approved templates available</option>
              ) : (
                approvedTemplates.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name} ({t.category})
                  </option>
                ))
              )}
            </select>
            <button
              type="button"
              onClick={() => {
                const tpl = approvedTemplates.find((t) => t.id === selectedTemplateId) || approvedTemplates[0];
                if (tpl) onSendTemplate(tpl);
              }}
              disabled={approvedTemplates.length === 0}
              className="px-4 py-2 bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white text-xs font-semibold rounded-lg shadow-sm transition-colors whitespace-nowrap"
            >
              Send Template
            </button>
          </div>
        </div>
      ) : (
        /* Active Composer */
        <div className="space-y-2">
          {session.channel === "whatsapp" && session.freeFormAllowed && (
            <div className="flex items-center justify-between text-xs text-blue-600 bg-blue-50 px-3 py-1.5 rounded-lg border border-blue-100">
              <span className="flex items-center gap-1.5 font-medium">
                <Clock className="w-3.5 h-3.5" />
                Reply window: {h}h {m}m left
              </span>
              <span className="text-[11px] text-blue-500">Free-text enabled</span>
            </div>
          )}

          <div className="flex items-center gap-2">
            {/* Attachment Button */}
            <button
              type="button"
              onClick={() => toast.info("Attachment picker opened")}
              className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              title="Attach File"
            >
              <Paperclip className="w-4 h-4" />
            </button>

            {/* Gear Settings Button + Popover */}
            <div className="relative" ref={gearMenuRef}>
              <button
                type="button"
                onClick={() => setShowGearMenu((prev) => !prev)}
                className={`p-2 rounded-lg transition-colors ${
                  showGearMenu ? "bg-blue-100 text-blue-600" : "text-gray-400 hover:text-gray-600 hover:bg-gray-100"
                }`}
                title="Message Actions & Settings"
              >
                <Settings className="w-4 h-4" />
              </button>

              {/* Settings Dropdown Popover */}
              {showGearMenu && (
                <div className="absolute bottom-10 left-0 z-50 w-56 bg-white border border-gray-200 rounded-xl shadow-xl py-1 text-xs animate-in fade-in zoom-in-95 duration-150">
                  <button
                    type="button"
                    onClick={() => {
                      setShowTemplateModal(true);
                      setShowGearMenu(false);
                    }}
                    className="w-full px-3 py-2 text-left hover:bg-blue-50 text-gray-700 flex items-center justify-between transition-colors"
                  >
                    <span className="flex items-center gap-2 font-medium">
                      <FileText className="w-4 h-4 text-blue-600" />
                      Share Template Message
                    </span>
                    <ChevronRight className="w-3 h-3 text-gray-400" />
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setShowCampaignModal(true);
                      setShowGearMenu(false);
                    }}
                    className="w-full px-3 py-2 text-left hover:bg-purple-50 text-gray-700 flex items-center justify-between transition-colors"
                  >
                    <span className="flex items-center gap-2 font-medium">
                      <Zap className="w-4 h-4 text-purple-600" />
                      Share Campaign
                    </span>
                    <ChevronRight className="w-3 h-3 text-gray-400" />
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
              className="flex-1 text-xs p-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 resize-none text-gray-800"
              style={{ fontFamily: "Outfit, sans-serif" }}
            />

            {/* Send button */}
            <button
              type="button"
              onClick={handleSendText}
              disabled={!inputText.trim()}
              className="p-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-xl shadow-sm transition-colors flex items-center justify-center cursor-pointer"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

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

      {/* Share Campaign Modal */}
      {showCampaignModal && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <h3 className="text-base font-bold text-gray-900" style={{ fontFamily: "Outfit, sans-serif" }}>
              Enroll Contact in Campaign
            </h3>
            <p className="text-xs text-gray-500">
              Select an active campaign to enroll this contact.
            </p>
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {MOCK_CAMPAIGNS.map((camp) => (
                <div
                  key={camp.id}
                  onClick={() => handleEnrollCampaignFromModal(camp)}
                  className="p-3 border border-gray-200 rounded-xl hover:border-purple-500 hover:bg-purple-50/50 cursor-pointer transition-all space-y-1 text-xs"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-gray-900">{camp.name}</span>
                    <span className="px-2 py-0.5 bg-purple-100 text-purple-700 text-[10px] rounded-full font-medium">
                      {camp.audience}
                    </span>
                  </div>
                  <p className="text-gray-500 text-[11px]">First Step: {camp.nodes[0]?.content}</p>
                </div>
              ))}
            </div>
            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={() => setShowCampaignModal(false)}
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
