import React, { useState, useMemo } from "react";
import { Users, Shield, Check, UserPlus, Search, ChevronDown } from "lucide-react";
import DrawerShell from "../ui/DrawerShell";
import { Tooltip } from "../ui/Tooltip";
import { InfoTooltip } from "../help/InfoTooltip";
import { GroupChatConfig, GroupChatPermissions, Conversation } from "../../../lib/useConversations";
import { getClientList } from "../../../lib/getClientList";
import { getStoredTeamMembers } from "../../../lib/teamStore";
import { toast } from "sonner";

export interface CreateGroupChatDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onCreateGroup: (params: {
    name: string;
    chatType: "private" | "public";
    autoDelete: "never" | "24h" | "7d" | "30d";
    description?: string;
    memberIds: string[];
    moderatorIds: string[];
    ownerId: string;
    ownerName: string;
    permissions: GroupChatPermissions;
  }) => Conversation | void;
}

const DEFAULT_TEAM_MEMBERS = [
  { id: "usr-doc-1", name: "Dr. Alistair Mehta", role: "Lead Physician" },
  { id: "usr-doc-2", name: "Dr. Rachel Reynolds", role: "Clinical Director" },
  { id: "usr-coord-1", name: "Elena Rostova", role: "Care Coordinator" },
  { id: "usr-admin-1", name: "Clinic Admin", role: "Practice Admin" },
];

export default function CreateGroupChatDrawer({
  isOpen,
  onClose,
  onCreateGroup,
}: CreateGroupChatDrawerProps) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [selectedMembers, setSelectedMembers] = useState<string[]>(["usr-admin-1"]);
  const [selectedModerators, setSelectedModerators] = useState<string[]>(["usr-admin-1"]);
  const [whoCanAddMembers, setWhoCanAddMembers] = useState<"all" | "moderators">("moderators");
  const [whoCanPost, setWhoCanPost] = useState<"all" | "moderators">("all");
  const [memberTab, setMemberTab] = useState<"contacts" | "team">("contacts");
  const [memberSearch, setMemberSearch] = useState("");

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

  // Filter candidates based on active toggle
  const activeCandidates = memberTab === "contacts" ? contactCandidates : teamCandidates;
  const filteredCandidates = activeCandidates.filter(
    (c) =>
      c.name.toLowerCase().includes(memberSearch.toLowerCase()) ||
      c.role.toLowerCase().includes(memberSearch.toLowerCase())
  );

  const selectedContactCount = selectedMembers.filter((id) =>
    contactCandidates.some((c) => c.id === id)
  ).length;

  const selectedTeamCount = selectedMembers.filter((id) =>
    teamCandidates.some((t) => t.id === id)
  ).length;

  const toggleMember = (id: string) => {
    if (selectedMembers.includes(id)) {
      if (id === "usr-admin-1") {
        toast.error("Owner cannot be removed from group");
        return;
      }
      setSelectedMembers((prev) => prev.filter((m) => m !== id));
      setSelectedModerators((prev) => prev.filter((m) => m !== id));
    } else {
      setSelectedMembers((prev) => [...prev, id]);
    }
  };

  const toggleModerator = (id: string) => {
    if (!selectedMembers.includes(id)) {
      setSelectedMembers((prev) => [...prev, id]);
    }
    if (selectedModerators.includes(id)) {
      if (id === "usr-admin-1") return;
      setSelectedModerators((prev) => prev.filter((m) => m !== id));
    } else {
      setSelectedModerators((prev) => [...prev, id]);
    }
  };

  const handleCreate = () => {
    if (!name.trim()) {
      toast.error("Chat name is required");
      return;
    }
    if (selectedMembers.length === 0) {
      toast.error("Please select at least one member");
      return;
    }

    onCreateGroup({
      name: name.trim(),
      chatType: "private",
      autoDelete: "never",
      description: description.trim() || undefined,
      memberIds: selectedMembers,
      moderatorIds: selectedModerators,
      ownerId: "usr-admin-1",
      ownerName: "Clinic Admin",
      permissions: {
        whoCanAddMembers,
        whoCanPost,
      },
    });

    toast.success(`Group "${name.trim()}" created`);
    setName("");
    setDescription("");
    setSelectedMembers(["usr-admin-1"]);
    setSelectedModerators(["usr-admin-1"]);
    onClose();
  };

  return (
    <DrawerShell
      isOpen={isOpen}
      onClose={onClose}
      title="Create Group"
      subtitle="New Group Collaboration"
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
            onClick={handleCreate}
            disabled={!name.trim()}
            className="px-4 py-1.5 rounded-xl bg-[#1E293B] hover:bg-slate-800 disabled:opacity-40 text-white text-xs font-semibold shadow-xs flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            Create Group
          </button>
        </div>
      }
      bodyClassName="flex-1 overflow-y-auto p-5 space-y-5 bg-slate-50/50"
    >
      {/* ── Basic Info Card ── */}
      <div className="bg-white border border-gray-200/90 rounded-2xl p-5 shadow-xs space-y-4">
        <div className="flex items-center justify-between border-b border-gray-100 pb-3">
          <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
            Group Information
          </h3>
          <InfoTooltip content="Basic identity and guidelines for this group conversation" />
        </div>

        {/* Chat Name */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label className="text-xs font-semibold text-slate-700">
              Group Name <span className="text-red-500">*</span>
            </label>
            <InfoTooltip content="The visible display title for all team members and clients in this channel" />
          </div>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Oncology Clinical Pathway, Wellness Circle"
            className="w-full text-xs p-2.5 bg-slate-50 border border-gray-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#1456f0]/15 focus:border-[#1456f0] text-slate-900"
          />
        </div>

        {/* Description */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label className="text-xs font-semibold text-slate-700">
              Description
            </label>
            <InfoTooltip content="State the objective, operating hours, and guidelines for participants" />
          </div>
          <textarea
            rows={3}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="State the purpose and scope of this conversation group..."
            className="w-full text-xs p-2.5 bg-slate-50 border border-gray-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#1456f0]/15 focus:border-[#1456f0] text-slate-900 resize-none"
          />
        </div>
      </div>

      {/* ── Access Permissions Card ── */}
      <div className="bg-white border border-gray-200/90 rounded-2xl p-5 shadow-xs space-y-4">
        <div className="flex items-center justify-between border-b border-gray-100 pb-3">
          <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
            Access Permissions
          </h3>
          <InfoTooltip content="Role-based permissions governing member addition and message posting rights" />
        </div>

        {/* Who Can Add Members */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-slate-700 block">
            Who Can Add Members
          </label>
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
          <label className="text-xs font-semibold text-slate-700 block">
            Who Can Send Messages
          </label>
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

      {/* ── Add Members Selection Card with Two Toggles: Contacts & Team Member ── */}
      <div className="bg-white border border-gray-200/90 rounded-2xl p-5 shadow-xs space-y-4">
        <div className="flex items-center justify-between border-b border-gray-100 pb-3">
          <div className="flex items-center gap-2">
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
              Add Members ({selectedMembers.length})
            </h3>
          </div>
          <InfoTooltip content="Select contacts and team members. Toggle moderator status for team members." />
        </div>

        {/* Two Toggles: Contacts and Team Member */}
        <div className="flex items-center p-1 bg-slate-100 rounded-xl">
          <button
            type="button"
            onClick={() => setMemberTab("contacts")}
            className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
              memberTab === "contacts"
                ? "bg-white text-slate-900 shadow-2xs"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <span>Contacts</span>
            <span
              className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                memberTab === "contacts" ? "bg-slate-100 text-slate-800" : "bg-slate-200/60 text-slate-500"
              }`}
            >
              {selectedContactCount}
            </span>
          </button>
          <button
            type="button"
            onClick={() => setMemberTab("team")}
            className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
              memberTab === "team"
                ? "bg-white text-slate-900 shadow-2xs"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <span>Team Member</span>
            <span
              className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                memberTab === "team" ? "bg-slate-100 text-slate-800" : "bg-slate-200/60 text-slate-500"
              }`}
            >
              {selectedTeamCount}
            </span>
          </button>
        </div>

        {/* Member Search */}
        <div className="relative">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={memberSearch}
            onChange={(e) => setMemberSearch(e.target.value)}
            placeholder={
              memberTab === "contacts"
                ? "Search contacts by name or phone..."
                : "Search team members by name or role..."
            }
            className="w-full text-xs pl-8 pr-3 py-2 bg-slate-50 border border-gray-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#1456f0]/15 focus:border-[#1456f0] text-slate-900"
          />
        </div>

        {/* Candidate List */}
        <div className="max-h-60 overflow-y-auto divide-y divide-gray-100 border border-gray-100 rounded-xl">
          {filteredCandidates.map((cand) => {
            const isMember = selectedMembers.includes(cand.id);
            const isMod = selectedModerators.includes(cand.id);
            const isOwner = cand.id === "usr-admin-1";

            return (
              <div
                key={cand.id}
                className="p-2.5 px-3 flex items-center justify-between hover:bg-slate-50/70 transition-colors"
              >
                <div
                  onClick={() => toggleMember(cand.id)}
                  className="flex items-center gap-2.5 flex-1 min-w-0 cursor-pointer"
                >
                  <div
                    className={`w-4 h-4 rounded border flex items-center justify-center transition-colors shrink-0 ${
                      isMember
                        ? "bg-slate-900 border-slate-900 text-white"
                        : "border-gray-300 bg-white"
                    }`}
                  >
                    {isMember && <Check className="w-3 h-3" />}
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-slate-900 truncate">
                      {cand.name} {isOwner && "(Owner)"}
                    </p>
                    <p className="text-[11px] text-slate-500 font-normal truncate">
                      {cand.role}
                    </p>
                  </div>
                </div>

                {memberTab === "team" && isMember && !isOwner && (
                  <Tooltip content={isMod ? "Revoke moderator rights" : "Promote to moderator"}>
                    <button
                      type="button"
                      onClick={() => toggleModerator(cand.id)}
                      className={`text-[10px] font-semibold px-2 py-1 rounded-lg border transition-colors cursor-pointer ${
                        isMod
                          ? "bg-slate-100 border-slate-300 text-slate-800"
                          : "border-gray-200 text-slate-400 hover:text-slate-700 hover:bg-gray-50"
                      }`}
                    >
                      {isMod ? "Moderator" : "Make Moderator"}
                    </button>
                  </Tooltip>
                )}
              </div>
            );
          })}

          {filteredCandidates.length === 0 && (
            <div className="p-4 text-center text-xs text-slate-400">
              No {memberTab === "contacts" ? "contacts" : "team members"} match "{memberSearch}"
            </div>
          )}
        </div>
      </div>
    </DrawerShell>
  );
}
