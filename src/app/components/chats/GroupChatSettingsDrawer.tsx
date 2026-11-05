import React, { useState, useMemo } from "react";
import { Users, Shield, Trash2, UserPlus, Search, ChevronDown } from "lucide-react";
import DrawerShell from "../ui/DrawerShell";
import { Tooltip } from "../ui/Tooltip";
import { InfoTooltip } from "../help/InfoTooltip";
import { Conversation, GroupChatConfig } from "../../../lib/useConversations";
import { getClientList } from "../../../lib/getClientList";
import { getStoredTeamMembers } from "../../../lib/teamStore";
import { toast } from "sonner";

export interface GroupChatSettingsDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  conversation?: Conversation;
  onUpdateGroup: (id: string, patch: Partial<GroupChatConfig>) => void;
}

const DEFAULT_TEAM_MEMBERS = [
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
  const [showAddMember, setShowAddMember] = useState(false);
  const [addMemberTab, setAddMemberTab] = useState<"contacts" | "team">("contacts");
  const [searchMember, setSearchMember] = useState("");

  // Contacts
  const allClients = getClientList();
  const contactCandidates = useMemo(() => {
    return allClients.map((c) => ({
      id: c.id,
      name: c.name,
      role: c.phoneNumber ? `${c.phoneNumber} • Contact` : "Patient / Contact",
    }));
  }, [allClients]);

  // Team Members
  const storedTeam = getStoredTeamMembers();
  const teamCandidates = useMemo(() => {
    const list = [...DEFAULT_TEAM_MEMBERS];
    storedTeam.forEach((tm) => {
      const idStr = String(tm.id);
      if (!list.some((existing) => existing.id === idStr || existing.name.toLowerCase() === tm.name.toLowerCase())) {
        list.push({
          id: `usr-team-${idStr}`,
          name: tm.name,
          role: tm.role || tm.department || "Staff",
        });
      }
    });
    return list;
  }, [storedTeam]);

  const allCandidates = useMemo(() => {
    return [...teamCandidates, ...contactCandidates];
  }, [teamCandidates, contactCandidates]);

  const currentMembers = allCandidates.filter((c) => cfg.memberIds.includes(c.id));

  // Available to add filtered by active tab
  const activeCandidatesToAdd = addMemberTab === "contacts" ? contactCandidates : teamCandidates;
  const availableToAdd = activeCandidatesToAdd.filter(
    (c) =>
      !cfg.memberIds.includes(c.id) &&
      (c.name.toLowerCase().includes(searchMember.toLowerCase()) ||
        c.role.toLowerCase().includes(searchMember.toLowerCase()))
  );

  const handleSave = () => {
    onUpdateGroup(conversation.id, {
      description: description.trim() || undefined,
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
        <div className="flex items-center gap-1.5 border-b border-gray-100 pb-3">
          <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
            Group Information
          </h3>
          <InfoTooltip content="Configured identity and owner details for this channel" />
        </div>

        <div>
          <label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block mb-1">
            Group Owner
          </label>
          <p className="text-xs font-bold text-slate-800">{cfg.ownerName}</p>
        </div>

        <div className="space-y-1.5">
          <div className="flex items-center gap-1.5">
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
        <div className="flex items-center gap-1.5 border-b border-gray-100 pb-3">
          <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
            Access Permissions
          </h3>
          <InfoTooltip content="Posting and member invitation rights" />
        </div>

        {/* Who Can Add Members */}
        <div className="space-y-1.5">
          <div className="flex items-center gap-1.5">
            <label className="text-xs font-semibold text-slate-700">
              Who Can Add Members
            </label>
            <InfoTooltip content="Only moderators or any member can invite colleagues" />
          </div>
          <div className="relative">
            <select
              value={whoCanAddMembers}
              onChange={(e) => setWhoCanAddMembers(e.target.value as any)}
              className="w-full text-xs p-2.5 bg-slate-50 border border-gray-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#1456f0]/15 focus:border-[#1456f0] text-slate-900 cursor-pointer appearance-none pr-8 font-medium"
            >
              <option value="moderators">Group Admin</option>
              <option value="all">Anyone in the group</option>
            </select>
            <ChevronDown className="w-4 h-4 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>
        </div>

        {/* Who Can Send Messages */}
        <div className="space-y-1.5">
          <div className="flex items-center gap-1.5">
            <label className="text-xs font-semibold text-slate-700">
              Who Can Send Messages
            </label>
            <InfoTooltip content="Restrict to moderators for broadcast channel mode" />
          </div>
          <div className="relative">
            <select
              value={whoCanPost}
              onChange={(e) => setWhoCanPost(e.target.value as any)}
              className="w-full text-xs p-2.5 bg-slate-50 border border-gray-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#1456f0]/15 focus:border-[#1456f0] text-slate-900 cursor-pointer appearance-none pr-8 font-medium"
            >
              <option value="moderators">Group Admin</option>
              <option value="all">Anyone in the group</option>
            </select>
            <ChevronDown className="w-4 h-4 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>
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
            className="text-xs text-slate-700 hover:text-slate-950 cursor-pointer flex items-center gap-1 font-semibold"
          >
            <UserPlus className="w-3.5 h-3.5" />
            <span>{showAddMember ? "Close" : "+ Add Member"}</span>
          </button>
        </div>

        {/* Add Member Drawer Panel with Two Toggles */}
        {showAddMember && (
          <div className="p-3 bg-slate-50 rounded-xl border border-gray-200 space-y-3">
            {/* Two Toggles: Contacts and Team Member */}
            <div className="flex items-center p-1 bg-white rounded-xl border border-gray-200">
              <button
                type="button"
                onClick={() => setAddMemberTab("contacts")}
                className={`flex-1 py-1 px-3 rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                  addMemberTab === "contacts"
                    ? "bg-slate-900 text-white shadow-2xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                <span>Contacts</span>
              </button>
              <button
                type="button"
                onClick={() => setAddMemberTab("team")}
                className={`flex-1 py-1 px-3 rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                  addMemberTab === "team"
                    ? "bg-slate-900 text-white shadow-2xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                <span>Team Member</span>
              </button>
            </div>

            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchMember}
                onChange={(e) => setSearchMember(e.target.value)}
                placeholder={
                  addMemberTab === "contacts"
                    ? "Search contacts to add..."
                    : "Search team members to add..."
                }
                className="w-full text-xs pl-8 pr-3 py-1.5 bg-white border border-gray-200 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#1456f0]/15"
              />
            </div>

            <div className="max-h-40 overflow-y-auto divide-y divide-gray-100">
              {availableToAdd.length === 0 ? (
                <p className="text-[11px] text-slate-400 p-2 italic">
                  No {addMemberTab === "contacts" ? "contacts" : "team members"} available to add
                </p>
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
                      className="text-xs font-bold text-slate-700 hover:text-slate-900 px-2.5 py-1 rounded-lg bg-white border border-gray-200 hover:bg-slate-50 cursor-pointer shadow-2xs"
                    >
                      Add
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* Existing Members list */}
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
