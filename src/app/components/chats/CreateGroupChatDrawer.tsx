import React, { useState } from "react";
import { Users, Lock, Globe, Shield, Info, X, Check, Clock, UserPlus } from "lucide-react";
import DrawerShell from "../ui/DrawerShell";
import { Tooltip } from "../ui/Tooltip";
import { InfoTooltip } from "../help/InfoTooltip";
import { GroupChatConfig, GroupChatPermissions, Conversation } from "../../../lib/useConversations";
import { getClientList } from "../../../lib/getClientList";
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

const TEAM_MEMBERS = [
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
  const [chatType, setChatType] = useState<"private" | "public">("private");
  const [autoDelete, setAutoDelete] = useState<"never" | "24h" | "7d" | "30d">("never");
  const [description, setDescription] = useState("");
  const [selectedMembers, setSelectedMembers] = useState<string[]>(["usr-admin-1"]);
  const [selectedModerators, setSelectedModerators] = useState<string[]>(["usr-admin-1"]);
  const [whoCanAddMembers, setWhoCanAddMembers] = useState<"all" | "moderators">("moderators");
  const [whoCanPost, setWhoCanPost] = useState<"all" | "moderators">("all");
  const [memberSearch, setMemberSearch] = useState("");

  const allClients = getClientList();
  const contactCandidates = allClients.slice(0, 15).map((c) => ({
    id: c.id,
    name: c.name,
    role: "Patient / Client",
  }));

  const allCandidates = [...TEAM_MEMBERS, ...contactCandidates];

  const filteredCandidates = allCandidates.filter((c) =>
    c.name.toLowerCase().includes(memberSearch.toLowerCase()) ||
    c.role.toLowerCase().includes(memberSearch.toLowerCase())
  );

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
      chatType,
      autoDelete,
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
      title="Create Chat"
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
            Create Chat
          </button>
        </div>
      }
      bodyClassName="flex-1 overflow-y-auto p-5 space-y-5 bg-slate-50/50"
    >
      {/* ── Basic Info Card ── */}
      <div className="bg-white border border-gray-200/90 rounded-2xl p-5 shadow-xs space-y-4">
        <div className="flex items-center justify-between border-b border-gray-100 pb-3">
          <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
            Chat Information
          </h3>
          <InfoTooltip content="Basic identity and visibility configuration for this group conversation" />
        </div>

        {/* Chat Name */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label className="text-xs font-semibold text-slate-700">
              Chat Name <span className="text-red-500">*</span>
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

        {/* Chat Type (Private / Public) */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label className="text-xs font-semibold text-slate-700">
              Chat Type
            </label>
            <InfoTooltip content="Private chats require invitation. Public chats can be joined by any clinic practitioner or enrolled client." />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setChatType("private")}
              className={`p-2.5 rounded-xl border text-xs font-semibold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                chatType === "private"
                  ? "bg-slate-900 text-white border-slate-900"
                  : "bg-white text-slate-700 border-gray-200 hover:bg-slate-50"
              }`}
            >
              <Lock className="w-3.5 h-3.5" />
              <span>Private Chat</span>
            </button>
            <button
              type="button"
              onClick={() => setChatType("public")}
              className={`p-2.5 rounded-xl border text-xs font-semibold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                chatType === "public"
                  ? "bg-slate-900 text-white border-slate-900"
                  : "bg-white text-slate-700 border-gray-200 hover:bg-slate-50"
              }`}
            >
              <Globe className="w-3.5 h-3.5" />
              <span>Public Chat</span>
            </button>
          </div>
        </div>

        {/* Auto Delete Messages */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label className="text-xs font-semibold text-slate-700">
              Auto Delete Messages
            </label>
            <InfoTooltip content="Automatically purge chat history after the designated retention period for compliance" />
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
          <InfoTooltip content="Role-based permissions governing member recruitment and broadcast capabilities" />
        </div>

        {/* Who can add members */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label className="text-xs font-semibold text-slate-700">
              Who Can Add Members
            </label>
            <InfoTooltip content="Define whether any member can invite colleagues or only designated moderators" />
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

        {/* Who can post */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label className="text-xs font-semibold text-slate-700">
              Who Can Post Messages
            </label>
            <InfoTooltip content="Restrict posting to turn this channel into an announcement broadcast stream" />
          </div>
          <select
            value={whoCanPost}
            onChange={(e) => setWhoCanPost(e.target.value as any)}
            className="w-full text-xs p-2.5 bg-slate-50 border border-gray-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#1456f0]/15 focus:border-[#1456f0] text-slate-900 cursor-pointer"
          >
            <option value="all">All Group Members (Two-way discussion)</option>
            <option value="moderators">Only Owner & Moderators (Announcement Mode)</option>
          </select>
        </div>
      </div>

      {/* ── Members & Moderators Selection Card ── */}
      <div className="bg-white border border-gray-200/90 rounded-2xl p-5 shadow-xs space-y-4">
        <div className="flex items-center justify-between border-b border-gray-100 pb-3">
          <div className="flex items-center gap-2">
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
              Members ({selectedMembers.length})
            </h3>
          </div>
          <InfoTooltip content="Select practitioners and patients to add. Toggle moderator status to grant administrative controls." />
        </div>

        {/* Member Search */}
        <input
          type="text"
          value={memberSearch}
          onChange={(e) => setMemberSearch(e.target.value)}
          placeholder="Filter practitioners and patients..."
          className="w-full text-xs p-2.5 bg-slate-50 border border-gray-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#1456f0]/15 focus:border-[#1456f0] text-slate-900"
        />

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
                    <p className="text-[11px] text-slate-500 font-normal">
                      {cand.role}
                    </p>
                  </div>
                </div>

                {isMember && !isOwner && (
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
        </div>
      </div>
    </DrawerShell>
  );
}

