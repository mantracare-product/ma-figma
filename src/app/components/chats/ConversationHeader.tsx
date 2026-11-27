import React, { useState, useRef, useEffect, useMemo } from "react";
import { X, Bot, UserCheck, Users, Settings, Sparkles, Check } from "lucide-react";
import { Conversation } from "../../../lib/useConversations";
import { CHANNEL_LABELS } from "../../../constants/channels";
import { getStoredTeamMembers, cleanLegacyMembers } from "../../../lib/teamStore";

export interface ConversationHeaderProps {
  conversation: Conversation;
  channel?: string;
  isDrawer?: boolean;
  onClose?: () => void;
  onToggleBotStatus?: () => void;
  onOpenAssignBotModal?: () => void;
  onOpenAssignPersonModal?: () => void;
  onAssignResponsible?: (personId: string, personName: string) => void;
  onAssignToAgent?: () => void;
  onOpenGroupSettings?: () => void;
  availableEmployees?: Array<{ id: string; name: string; email?: string; role?: string }>;
}

export default function ConversationHeader({
  conversation,
  channel,
  isDrawer,
  onClose,
  onToggleBotStatus,
  onOpenAssignBotModal,
  onOpenAssignPersonModal,
  onAssignResponsible,
  onAssignToAgent,
  onOpenGroupSettings,
  availableEmployees = [
    { id: "1", name: "Sarah Johnson", email: "sarah.j@mantra.care" },
    { id: "2", name: "Michael Chen", email: "m.chen@mantra.care" },
    { id: "3", name: "Emily Rodriguez", email: "emily.r@mantra.care" },
  ],
}: ConversationHeaderProps) {
  const channelKey = conversation.channel || channel || "whatsapp";

  const isCompanion =
    conversation.channel === "companion" ||
    conversation.id === "care-bot-system" ||
    channel === "companion";

  const initials = conversation.contactName
    ? conversation.contactName.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2)
    : "C";

  const [assignMenuOpen, setAssignMenuOpen] = useState(false);
  const assignMenuRef = useRef<HTMLDivElement>(null);
  const [storedMembers, setStoredMembers] = useState<Array<{ id: string; name: string; email?: string; role?: string }>>([]);

  useEffect(() => {
    const loadMembers = () => {
      try {
        const stored = cleanLegacyMembers(getStoredTeamMembers());
        if (Array.isArray(stored) && stored.length > 0) {
          setStoredMembers(
            stored
              .filter((m) => m && m.name && m.status !== false)
              .map((m) => ({
                id: String(m.id),
                name: m.name,
                email: m.email || "",
                role: m.role || "Team Member",
              }))
          );
        }
      } catch {}
    };
    loadMembers();
  }, [assignMenuOpen]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (assignMenuRef.current && !assignMenuRef.current.contains(e.target as Node)) {
        setAssignMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const responsibleOptions = useMemo(() => {
    const list: Array<{ id: string; name: string; email?: string; role?: string }> = [...storedMembers];
    availableEmployees.forEach((emp) => {
      if (!list.some((m) => String(m.id) === String(emp.id) || m.name.toLowerCase() === emp.name.toLowerCase())) {
        list.push(emp);
      }
    });
    return list;
  }, [storedMembers, availableEmployees]);

  const assignedEmployee = responsibleOptions.find(
    (e) => String(e.id) === String(conversation.assignedPersonId)
  );
  const isAgentAssigned = conversation.botStatus === "active";
  const canInlineAssign = Boolean(onAssignResponsible || onAssignToAgent);

  const isWhatsApp = channelKey === "whatsapp" && !isCompanion && !conversation.isTeam && !conversation.isGroup;

  return (
    <div
      className={`px-5 py-3 flex items-center justify-between shrink-0 ${
        isWhatsApp
          ? "bg-white border-b border-[#e9edef]"
          : "bg-white border-b border-gray-200/90"
      }`}
    >
      <div className="flex items-center gap-3">
        <div
          className={`flex items-center justify-center font-bold shrink-0 shadow-2xs ${
            isWhatsApp
              ? "w-10 h-10 rounded-full bg-[#00a884] text-white text-sm"
              : "w-9 h-9 rounded-xl bg-[#1E293B] text-white text-xs"
          }`}
        >
          {conversation.isGroup ? <Users className="w-4 h-4" /> : initials}
        </div>
        <div>
          <h3
            className={`text-sm font-bold ${isWhatsApp ? "text-[#111b21]" : "text-[#1E293B]"}`}
            style={{ fontFamily: "Outfit, sans-serif" }}
          >
            {conversation.contactName || "Contact"}
          </h3>
          <p className={`text-xs tabular-nums ${isWhatsApp ? "text-[#667781]" : "text-[#64748b] font-mono"}`}>
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
        ) : conversation.isTeam || conversation.channel === "team" ? (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-blue-50 text-[#1456f0] text-xs font-semibold">
            <span className="w-1.5 h-1.5 rounded-full bg-[#10b981]" />
            <span>Direct Message</span>
          </span>
        ) : !isCompanion ? (
          <div className="relative" ref={assignMenuRef}>
            <button
              type="button"
              onClick={() => {
                if (canInlineAssign) {
                  setAssignMenuOpen((prev) => !prev);
                } else if (isAgentAssigned) {
                  onToggleBotStatus?.();
                } else if (conversation.assignedPersonId) {
                  onOpenAssignPersonModal?.();
                } else {
                  onOpenAssignBotModal?.();
                }
              }}
              className={
                isWhatsApp
                  ? isAgentAssigned || conversation.assignedPersonId
                    ? `inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#e7fce3] text-[#008069] border text-xs font-semibold hover:bg-[#d9fdd3] transition-colors cursor-pointer ${
                        assignMenuOpen ? "border-[#008069] ring-1 ring-[#008069]/30" : "border-[#bbf7d0]"
                      }`
                    : `inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-100 text-slate-600 border text-xs font-semibold hover:bg-slate-200/70 transition-colors cursor-pointer ${
                        assignMenuOpen ? "border-slate-400" : "border-slate-200"
                      }`
                  : isAgentAssigned || conversation.assignedPersonId
                  ? "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-slate-700 text-xs font-semibold hover:bg-slate-50 transition-colors cursor-pointer"
                  : "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-slate-500 text-xs font-semibold hover:bg-slate-50 transition-colors cursor-pointer"
              }
            >
              {isAgentAssigned ? (
                <>
                  <Sparkles className={`w-3.5 h-3.5 ${isWhatsApp ? "text-[#008069]" : "text-emerald-600"}`} />
                  <span>Assigned: Agent</span>
                </>
              ) : conversation.assignedPersonId ? (
                <>
                  <UserCheck className={`w-3.5 h-3.5 ${isWhatsApp ? "text-[#008069]" : "text-slate-600"}`} />
                  <span>Assigned: {assignedEmployee?.name || "Team Member"}</span>
                </>
              ) : (
                <>
                  <Bot className={`w-3.5 h-3.5 ${isWhatsApp ? "text-slate-500" : "text-slate-400"}`} />
                  <span>Unassigned</span>
                </>
              )}
            </button>

            {canInlineAssign && assignMenuOpen && (
              <div className="absolute right-0 top-full mt-2 w-64 bg-white rounded-xl border border-slate-200 shadow-lg z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-100">
                <div className="px-3.5 py-2 text-[11px] font-semibold tracking-wider text-slate-400 uppercase border-b border-slate-100">
                  Assign Responsible
                </div>
                <div className="max-h-72 overflow-y-auto divide-y divide-slate-100">
                  {/* Option 1: Assign to Agent */}
                  <button
                    type="button"
                    onClick={() => {
                      if (onAssignToAgent) {
                        onAssignToAgent();
                      } else {
                        onOpenAssignBotModal?.();
                      }
                      setAssignMenuOpen(false);
                    }}
                    className="w-full px-3.5 py-2.5 text-left hover:bg-slate-50 flex items-center justify-between gap-2 transition-colors cursor-pointer"
                  >
                    <span className="flex items-center gap-2 text-xs font-semibold text-[#008069]">
                      <Sparkles className="w-3.5 h-3.5 shrink-0" />
                      <span>Assign to Agent</span>
                    </span>
                    {isAgentAssigned && <Check className="w-4 h-4 text-[#008069] shrink-0" />}
                  </button>

                  {/* Option 2: Unassigned */}
                  <button
                    type="button"
                    onClick={() => {
                      onAssignResponsible?.("", "Unassigned");
                      setAssignMenuOpen(false);
                    }}
                    className="w-full px-3.5 py-2.5 text-left hover:bg-slate-50 flex items-center justify-between gap-2 transition-colors cursor-pointer"
                  >
                    <span className="text-xs font-medium text-slate-700">Unassigned</span>
                    {!isAgentAssigned && !conversation.assignedPersonId && (
                      <Check className="w-4 h-4 text-[#008069] shrink-0" />
                    )}
                  </button>

                  {/* Option 3: Organization Team Members */}
                  {responsibleOptions.map((member) => {
                    const isMemberSelected =
                      !isAgentAssigned && String(conversation.assignedPersonId) === String(member.id);
                    return (
                      <button
                        key={member.id}
                        type="button"
                        onClick={() => {
                          onAssignResponsible?.(String(member.id), member.name);
                          setAssignMenuOpen(false);
                        }}
                        className="w-full px-3.5 py-2.5 text-left hover:bg-slate-50 flex items-center justify-between gap-2 transition-colors cursor-pointer"
                      >
                        <div className="min-w-0">
                          <p className="text-xs font-semibold text-slate-900 truncate">{member.name}</p>
                          {(member.email || member.role) && (
                            <p className="text-[11px] text-slate-400 truncate">
                              {member.email || member.role}
                            </p>
                          )}
                        </div>
                        {isMemberSelected && <Check className="w-4 h-4 text-[#008069] shrink-0" />}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
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
