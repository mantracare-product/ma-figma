import React, { useState } from "react";
import { Users, Lock, Globe, Shield, Info, Trash2, UserPlus, Clock, X, Check } from "lucide-react";
import DrawerShell from "../ui/DrawerShell";
import { Tooltip } from "../ui/Tooltip";
import { InfoTooltip } from "../help/InfoTooltip";
import { Conversation, GroupChatConfig } from "../../../lib/useConversations";
import { getClientList } from "../../../lib/getClientList";
import { toast } from "sonner";

export interface GroupChatSettingsDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  conversation?: Conversation;
  onUpdateGroup: (id: string, patch: Partial<GroupChatConfig>) => void;
}

const TEAM_MEMBERS = [
  { id: "usr-doc-1", name: "Dr. Alistair Mehta", role: "Lead Physician" },
  { id: "usr-doc-2", name: "Dr. Rachel Reynolds", role: "Clinical Director" },
  { id: "usr-coord-1", name: "Elena Rostova", role: "Care Coordinator" },
  { id: "usr-admin-1", name: "Clinic Admin", role: "Practice Admin" },
];

export default function GroupChatSettingsDrawer({
  isOpen,
  onClose,
  conversation,
  onUpdateGroup,
}: GroupChatSettingsDrawerProps) {
  if (!conversation || !conversation.isGroup || !conversation.groupConfig) return null;

  const cfg = conversation.groupConfig;
  const [description, setDescription] = useState(cfg.description || "");
  const [whoCanAddMembers, setWhoCanAddMembers] = useState(cfg.permissions.whoCanAddMembers);
  const [whoCanPost, setWhoCanPost] = useState(cfg.permissions.whoCanPost);
  const [autoDelete, setAutoDelete] = useState(cfg.autoDelete);
  const [showAddMember, setShowAddMember] = useState(false);
  const [searchMember, setSearchMember] = useState("");

  const allClients = getClientList();
  const allCandidates = [
    ...TEAM_MEMBERS,
    ...allClients.slice(0, 15).map((c) => ({ id: c.id, name: c.name, role: "Patient / Client" })),
  ];

  const currentMembers = allCandidates.filter((c) => cfg.memberIds.includes(c.id));
  const availableToAdd = allCandidates.filter(
    (c) =>
      !cfg.memberIds.includes(c.id) &&
      (c.name.toLowerCase().includes(searchMember.toLowerCase()) || c.role.toLowerCase().includes(searchMember.toLowerCase()))
  );

  const handleSave = () => {
    onUpdateGroup(conversation.id, {
      description: description.trim() || undefined,
      autoDelete,
      permissions: {
        whoCanAddMembers,
        whoCanPost,
      },
    });
    toast.success("Group settings updated");
    onClose();
  };

  const handleAddMember = (candidateId: string) => {
    const updated = [...cfg.memberIds, candidateId];
    onUpdateGroup(conversation.id, { memberIds: updated });
    toast.success("Member added to group");
  };

  const handleRemoveMember = (memberId: string) => {
    if (memberId === cfg.ownerId) {
      toast.error("Owner cannot be removed");
      return;
    }
    const updatedMembers = cfg.memberIds.filter((id) => id !== memberId);
    const updatedMods = cfg.moderatorIds.filter((id) => id !== memberId);
    onUpdateGroup(conversation.id, { memberIds: updatedMembers, moderatorIds: updatedMods });
    toast.success("Member removed");
  };

  const handleToggleModerator = (memberId: string) => {
    const isMod = cfg.moderatorIds.includes(memberId);
    const updatedMods = isMod ? cfg.moderatorIds.filter((id) => id !== memberId) : [...cfg.moderatorIds, memberId];
    onUpdateGroup(conversation.id, { moderatorIds: updatedMods });
    toast.success(isMod ? "Moderator permissions revoked" : "Moderator permissions granted");
  };

  return (
    <DrawerShell
      isOpen={isOpen}
      onClose={onClose}
      title={conversation.contactName}
      subtitle="Group Settings & Members"
      icon={<Users className="w-5 h-5 text-slate-700" />}
      width="max-w-[580px]"
      zIndex={650}
      headerRight={
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onClose}
            className="px-3.5 py-1.5 rounded-xl border border-gray-200 text-xs font-semibold text-gray-700 hover:bg-gray-50 transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="px-4 py-1.5 rounded-xl bg-[#1E293B] hover:bg-slate-800 text-white text-xs font-semibold shadow-xs flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            Save Changes
          </button>
        </div>
      }
      bodyClassName="flex-1 overflow-y-auto p-5 space-y-5 bg-slate-50/50"
    >
      {/* ── Group Details ── */}
      <div className="bg-white border border-gray-200/90 rounded-2xl p-5 shadow-xs space-y-4">
        <div className="flex items-center justify-between border-b border-gray-100 pb-3">
          <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
            Group Information
          </h3>
          <InfoTooltip content="Configured identity and retention properties for this channel" />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block mb-1">
              Chat Type
            </label>
            <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800">
              {cfg.chatType === "private" ? <Lock className="w-3.5 h-3.5" /> : <Globe className="w-3.5 h-3.5" />}
              <span>{cfg.chatType === "private" ? "Private Chat" : "Public Chat"}</span>
            </div>
          </div>
          <div>
            <label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block mb-1">
              Owner
            </label>
            <p className="text-xs font-bold text-slate-800">{cfg.ownerName}</p>
          </div>
        </div>

        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label className="text-xs font-semibold text-slate-700">
              Auto Delete Messages
            </label>
            <InfoTooltip content="Automatic retention window for compliance" />
          </div>
          <select
            value={autoDelete}
            onChange={(e) => setAutoDelete(e.target.value as any)}
            className="w-full text-xs p-2.5 bg-slate-50 border border-gray-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#1456f0]/15 focus:border-[#1456f0] text-slate-900 cursor-pointer"
          >
            <option value="never">Never (Keep entire history)</option>
            <option value="24h">24 Hours</option>
            <option value="7d">7 Days</option>
            <option value="30d">30 Days</option>
          </select>
        </div>

        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label className="text-xs font-semibold text-slate-700">
              Description
            </label>
            <InfoTooltip content="Guidelines and purpose for group participants" />
          </div>
          <textarea
            rows={2}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full text-xs p-2.5 bg-slate-50 border border-gray-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#1456f0]/15 focus:border-[#1456f0] text-slate-900 resize-none"
          />
        </div>
      </div>

      {/* ── Permissions Card ── */}
      <div className="bg-white border border-gray-200/90 rounded-2xl p-5 shadow-xs space-y-4">
        <div className="flex items-center justify-between border-b border-gray-100 pb-3">
          <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
            Permissions
          </h3>
          <InfoTooltip content="Posting and invitation rights" />
        </div>

        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label className="text-xs font-semibold text-slate-700">
              Who Can Add Members
            </label>
            <InfoTooltip content="Only moderators or any member can invite colleagues" />
          </div>
          <select
            value={whoCanAddMembers}
            onChange={(e) => setWhoCanAddMembers(e.target.value as any)}
            className="w-full text-xs p-2.5 bg-slate-50 border border-gray-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#1456f0]/15 focus:border-[#1456f0] text-slate-900 cursor-pointer"
          >
            <option value="moderators">Only Owner & Moderators</option>
            <option value="all">All Group Members</option>
          </select>
        </div>

        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label className="text-xs font-semibold text-slate-700">
              Who Can Post Messages
            </label>
            <InfoTooltip content="Restrict to moderators for broadcast channel mode" />
          </div>
          <select
            value={whoCanPost}
            onChange={(e) => setWhoCanPost(e.target.value as any)}
            className="w-full text-xs p-2.5 bg-slate-50 border border-gray-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#1456f0]/15 focus:border-[#1456f0] text-slate-900 cursor-pointer"
          >
            <option value="all">All Group Members</option>
            <option value="moderators">Only Owner & Moderators</option>
          </select>
        </div>
      </div>

      {/* ── Active Members Card ── */}
      <div className="bg-white border border-gray-200/90 rounded-2xl p-5 shadow-xs space-y-4">
        <div className="flex items-center justify-between border-b border-gray-100 pb-3">
          <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
            Active Members ({cfg.memberIds.length})
          </h3>
          <button
            type="button"
            onClick={() => setShowAddMember((prev) => !prev)}
            className="text-xs text-slate-500 hover:text-slate-800 hover:underline cursor-pointer flex items-center gap-1 font-medium"
          >
            <UserPlus className="w-3.5 h-3.5" />
            <span>+ Add Member</span>
          </button>
        </div>

        {showAddMember && (
          <div className="p-3 bg-slate-50 rounded-xl border border-gray-200 space-y-2">
            <input
              type="text"
              value={searchMember}
              onChange={(e) => setSearchMember(e.target.value)}
              placeholder="Search people to add..."
              className="w-full text-xs p-2 bg-white border border-gray-200 rounded-lg text-slate-900"
            />
            <div className="max-h-40 overflow-y-auto divide-y divide-gray-100">
              {availableToAdd.length === 0 ? (
                <p className="text-[11px] text-slate-400 p-2 italic">No more members to add</p>
              ) : (
                availableToAdd.map((cand) => (
                  <div key={cand.id} className="p-2 flex items-center justify-between">
                    <div>
                      <p className="text-xs font-semibold text-slate-800">{cand.name}</p>
                      <p className="text-[10px] text-slate-500">{cand.role}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleAddMember(cand.id)}
                      className="text-xs font-bold text-slate-700 hover:text-slate-900 px-2 py-1 rounded bg-white border border-gray-200 cursor-pointer"
                    >
                      Add
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        <div className="divide-y divide-gray-100 border border-gray-100 rounded-xl max-h-56 overflow-y-auto">
          {currentMembers.map((m) => {
            const isOwner = m.id === cfg.ownerId;
            const isMod = cfg.moderatorIds.includes(m.id);
            return (
              <div key={m.id} className="p-2.5 px-3 flex items-center justify-between hover:bg-slate-50/70">
                <div>
                  <p className="text-xs font-bold text-slate-900">
                    {m.name} {isOwner && "(Owner)"}
                  </p>
                  <p className="text-[11px] text-slate-500">{m.role}</p>
                </div>
                {!isOwner && (
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => handleToggleModerator(m.id)}
                      className={`text-[10px] font-semibold px-2 py-0.5 rounded border cursor-pointer ${
                        isMod ? "bg-slate-100 border-slate-300 text-slate-800" : "border-gray-200 text-slate-400 hover:text-slate-700"
                      }`}
                    >
                      {isMod ? "Moderator" : "Make Mod"}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleRemoveMember(m.id)}
                      className="p-1 text-slate-400 hover:text-red-600 rounded transition-colors cursor-pointer"
                      title="Remove member"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </DrawerShell>
  );
}

