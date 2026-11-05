import React, { useState, useMemo } from "react";
import {
  Users,
  ShieldCheck,
  FileText,
  Download,
  Calendar,
  CheckSquare,
  LogOut,
  AlertTriangle,
  Search,
  Lock,
  Globe,
  Clock,
  UserCheck,
} from "lucide-react";
import DrawerShell from "../../../components/ui/DrawerShell";
import { Tooltip } from "../../../components/ui/Tooltip";
import { Conversation } from "../../../../lib/useConversations";
import { getClientList } from "../../../../lib/getClientList";
import { useTasks } from "../../../../lib/tasksStore";
import { toast } from "sonner";

export interface PatientGroupInfoDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  conversation: Conversation;
  activeClient: {
    id: string;
    name: string;
    email?: string;
    phoneNumber?: string;
  };
  onLeaveGroup: () => void;
}

const TEAM_MEMBERS = [
  { id: "usr-doc-1", name: "Dr. Alistair Mehta", role: "Lead Physician" },
  { id: "usr-doc-2", name: "Dr. Rachel Reynolds", role: "Clinical Director" },
  { id: "usr-coord-1", name: "Elena Rostova", role: "Care Coordinator" },
  { id: "usr-admin-1", name: "Clinic Admin", role: "Practice Admin" },
];

function formatTimestamp(ts?: string): string {
  if (!ts) return "";
  if (ts.includes("T") && (ts.endsWith("Z") || ts.includes("+") || ts.includes("-"))) {
    try {
      const d = new Date(ts);
      if (!isNaN(d.getTime())) {
        return d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit", hour12: true });
      }
    } catch {}
  }
  return ts;
}

export default function PatientGroupInfoDrawer({
  isOpen,
  onClose,
  conversation,
  activeClient,
  onLeaveGroup,
}: PatientGroupInfoDrawerProps) {
  const [activeTab, setActiveTab] = useState<"members" | "files" | "tasks">("members");
  const [searchMember, setSearchMember] = useState("");
  const [showLeaveConfirm, setShowLeaveConfirm] = useState(false);

  const { tasks } = useTasks();

  const cfg = conversation.groupConfig;

  // ── Resolve All Members ──
  const currentMembers = useMemo(() => {
    if (!cfg || !cfg.memberIds) return [];
    const allClients = getClientList();

    return cfg.memberIds.map((id) => {
      // Check if current active client
      const isCurrentClient =
        id === activeClient.id ||
        (id === "CL-001" && activeClient.name.toLowerCase().includes("sarah"));

      if (isCurrentClient) {
        return {
          id,
          name: activeClient.name,
          role: "Patient (You)",
          isMe: true,
          isAdmin: id === cfg.ownerId,
          isMod: cfg.moderatorIds.includes(id),
        };
      }

      // Check Team Members
      const team = TEAM_MEMBERS.find((t) => t.id === id);
      if (team) {
        return {
          id,
          name: team.name,
          role: team.role,
          isMe: false,
          isAdmin: id === cfg.ownerId,
          isMod: cfg.moderatorIds.includes(id),
        };
      }

      // Check Client List
      const client = allClients.find((c) => c.id === id);
      if (client) {
        return {
          id,
          name: client.name,
          role: "Patient / Client",
          isMe: false,
          isAdmin: id === cfg.ownerId,
          isMod: cfg.moderatorIds.includes(id),
        };
      }

      // Fallback
      return {
        id,
        name: id === cfg.ownerId ? cfg.ownerName : `Member ${id}`,
        role: "Care Team Member",
        isMe: false,
        isAdmin: id === cfg.ownerId,
        isMod: cfg.moderatorIds.includes(id),
      };
    });
  }, [cfg, activeClient]);

  // Filter members by search
  const filteredMembers = useMemo(() => {
    if (!searchMember.trim()) return currentMembers;
    const term = searchMember.toLowerCase();
    return currentMembers.filter(
      (m) => m.name.toLowerCase().includes(term) || m.role.toLowerCase().includes(term)
    );
  }, [currentMembers, searchMember]);

  // ── Resolve Shared Files ──
  const groupFiles = useMemo(() => {
    const fromMessages = conversation.messages
      .filter((m) => m.attachment)
      .map((m) => ({
        id: m.id,
        name: m.attachment!.name,
        size: m.attachment!.size,
        type: m.attachment!.type,
        senderName: m.senderName || (m.sender === "me" ? "Me" : conversation.contactName),
        timestamp: formatTimestamp(m.timestamp) || "Recent",
      }));

    // Curated files for specific clinical groups to ensure comprehensive view
    const curatedDefaults =
      conversation.id === "grp-clinical-care"
        ? [
            {
              id: "cur-1",
              name: "Oncology_Lab_Panel_Guide_2026.pdf",
              size: "620 KB",
              type: "application/pdf",
              senderName: "Dr. Alistair Mehta",
              timestamp: "Yesterday",
            },
            {
              id: "cur-2",
              name: "Pre_Visit_Fasting_Instructions.pdf",
              size: "185 KB",
              type: "application/pdf",
              senderName: "Dr. Rachel Reynolds",
              timestamp: "2 days ago",
            },
          ]
        : [
            {
              id: "cur-3",
              name: "Patient_Wellness_Action_Plan_2026.pdf",
              size: "410 KB",
              type: "application/pdf",
              senderName: "Clinic Admin",
              timestamp: "3 days ago",
            },
            {
              id: "cur-4",
              name: "Nutrition_DropIn_Schedule_Spring.pdf",
              size: "245 KB",
              type: "application/pdf",
              senderName: "Care Coordinator",
              timestamp: "Yesterday",
            },
          ];

    const seenNames = new Set<string>();
    const combined = [];
    for (const file of [...fromMessages, ...curatedDefaults]) {
      if (!seenNames.has(file.name)) {
        seenNames.add(file.name);
        combined.push(file);
      }
    }
    return combined;
  }, [conversation]);

  // ── Resolve Tasks Associated with this Group ──
  const groupTasks = useMemo(() => {
    if (!conversation.isGroup) return [];

    if (conversation.id === "grp-clinical-care") {
      return tasks.filter(
        (t) =>
          t.project?.toLowerCase().includes("oncology") ||
          t.title.toLowerCase().includes("lab") ||
          t.title.toLowerCase().includes("fasting") ||
          t.assignee.assigneeName?.includes("Alistair")
      );
    }

    if (conversation.id === "grp-patient-support") {
      return tasks.filter(
        (t) =>
          t.project?.toLowerCase().includes("patient") ||
          t.project?.toLowerCase().includes("journey") ||
          t.title.toLowerCase().includes("protocol") ||
          t.title.toLowerCase().includes("intake") ||
          t.title.toLowerCase().includes("cardiac")
      );
    }

    // Default fallback
    return tasks.filter((t) => t.scopeLevel === "client");
  }, [tasks, conversation]);

  const handleDownloadFile = (fileName: string) => {
    toast.success(`Downloading "${fileName}"`);
  };

  const getInitials = (name: string) => {
    const parts = name.replace("Dr. ", "").trim().split(" ");
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  };

  return (
    <>
      <DrawerShell
        isOpen={isOpen}
        onClose={onClose}
        title={conversation.contactName}
        subtitle={`Group · ${currentMembers.length} members`}
        icon={<Users className="w-5 h-5 text-slate-700" />}
        width="max-w-[480px]"
        zIndex={650}
        tabs={
          <div className="flex items-center gap-1.5 overflow-x-auto py-0.5 no-scrollbar">
            <button
              type="button"
              onClick={() => setActiveTab("members")}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 shrink-0 ${
                activeTab === "members"
                  ? "bg-slate-900 text-white shadow-xs"
                  : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              <span>Members &amp; Admin</span>
              <span
                className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                  activeTab === "members" ? "bg-slate-800 text-slate-200" : "bg-slate-200 text-slate-700"
                }`}
              >
                {currentMembers.length}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("files")}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 shrink-0 ${
                activeTab === "files"
                  ? "bg-slate-900 text-white shadow-xs"
                  : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              <span>Files</span>
              <span
                className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                  activeTab === "files" ? "bg-slate-800 text-slate-200" : "bg-slate-200 text-slate-700"
                }`}
              >
                {groupFiles.length}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("tasks")}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 shrink-0 ${
                activeTab === "tasks"
                  ? "bg-slate-900 text-white shadow-xs"
                  : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
              }`}
            >
              <CheckSquare className="w-3.5 h-3.5" />
              <span>Tasks</span>
              <span
                className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                  activeTab === "tasks" ? "bg-slate-800 text-slate-200" : "bg-slate-200 text-slate-700"
                }`}
              >
                {groupTasks.length}
              </span>
            </button>
          </div>
        }
        footer={
          <div className="w-full flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-xs font-medium text-slate-700 truncate">Group Membership</p>
              <p className="text-[11px] text-slate-500 truncate">Leave this group anytime</p>
            </div>
            <button
              type="button"
              onClick={() => setShowLeaveConfirm(true)}
              className="px-3.5 py-2 rounded-xl border border-red-200 text-red-600 hover:bg-red-50 hover:border-red-300 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer shrink-0 shadow-2xs"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Leave Group</span>
            </button>
          </div>
        }
      >
        {/* ── TAB 1: MEMBERS & ADMIN ── */}
        {activeTab === "members" && (
          <div className="space-y-5">
            {/* Group Admin Spotlight Card */}
            <div className="bg-slate-50/80 border border-slate-200/90 rounded-2xl p-4 shadow-2xs space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-xs font-bold text-slate-900 uppercase tracking-wider">
                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                  <span>Group Administrator</span>
                </div>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-100/80 text-emerald-800 text-[10px] font-bold">
                  Verified Lead
                </span>
              </div>

              <div className="flex items-center gap-3 pt-1">
                <div className="w-10 h-10 rounded-xl bg-slate-900 text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-xs">
                  {cfg?.ownerName ? getInitials(cfg.ownerName) : "AD"}
                </div>
                <div className="min-w-0">
                  <h4 className="text-sm font-bold text-slate-900 truncate">
                    {cfg?.ownerName || "Dr. Alistair Mehta"}
                  </h4>
                  <p className="text-xs text-slate-500 truncate">
                    {cfg?.ownerId === "usr-admin-1" ? "Practice Administrator" : "Lead Responsible Physician"}
                  </p>
                </div>
              </div>

              {cfg?.description && (
                <p className="text-xs text-slate-600 leading-relaxed bg-white/70 p-2.5 rounded-xl border border-slate-200/60">
                  {cfg.description}
                </p>
              )}

              <div className="grid grid-cols-2 gap-2 pt-1 border-t border-slate-200/60 text-[11px] text-slate-600">
                <div className="flex items-center gap-1.5">
                  {cfg?.chatType === "private" ? (
                    <Lock className="w-3.5 h-3.5 text-slate-400" />
                  ) : (
                    <Globe className="w-3.5 h-3.5 text-slate-400" />
                  )}
                  <span>{cfg?.chatType === "private" ? "Private Care Group" : "Public Care Group"}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-slate-400" />
                  <span>{cfg?.autoDelete === "never" ? "History retained" : `Auto-deletes ${cfg?.autoDelete}`}</span>
                </div>
              </div>
            </div>

            {/* Members Search & List */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                  Group Members ({currentMembers.length})
                </h4>
              </div>

              {/* Search input */}
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchMember}
                  onChange={(e) => setSearchMember(e.target.value)}
                  placeholder="Filter members by name or role..."
                  className="w-full pl-9 pr-3 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#1456f0]/20 focus:border-[#1456f0]"
                />
              </div>

              {/* Member cards */}
              <div className="space-y-2">
                {filteredMembers.map((member) => (
                  <div
                    key={member.id}
                    className="p-3 bg-white border border-slate-200/80 rounded-xl flex items-center justify-between gap-3 shadow-2xs hover:border-slate-300 transition-colors"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-xs shrink-0 ${
                          member.isMe
                            ? "bg-[#1456f0] text-white"
                            : member.isAdmin
                            ? "bg-slate-900 text-white"
                            : "bg-slate-100 text-slate-700"
                        }`}
                      >
                        {getInitials(member.name)}
                      </div>

                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <p className="text-xs font-bold text-slate-900 truncate">
                            {member.name}
                          </p>
                          {member.isMe && (
                            <span className="text-[10px] font-bold px-1.5 py-0.2 rounded-full bg-blue-50 text-blue-700">
                              You
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-slate-500 truncate">{member.role}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      {member.isAdmin && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-800 border border-slate-200">
                          Admin
                        </span>
                      )}
                      {member.isMod && !member.isAdmin && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-100">
                          Mod
                        </span>
                      )}
                    </div>
                  </div>
                ))}

                {filteredMembers.length === 0 && (
                  <div className="py-6 text-center text-xs text-slate-500">
                    No members match "{searchMember}"
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ── TAB 2: FILES ── */}
        {activeTab === "files" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                  Shared Files &amp; Documents
                </h4>
                <p className="text-xs text-slate-500 mt-0.5">
                  Attachments and clinical guides shared in this channel
                </p>
              </div>
            </div>

            <div className="space-y-2">
              {groupFiles.map((file) => (
                <div
                  key={file.id}
                  className="p-3 bg-white border border-slate-200/80 rounded-xl flex items-center justify-between gap-3 shadow-2xs hover:border-slate-300 transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-9 h-9 rounded-xl bg-blue-50 text-[#1456f0] flex items-center justify-center shrink-0 border border-blue-100">
                      <FileText className="w-4 h-4" />
                    </div>

                    <div className="min-w-0">
                      <p className="text-xs font-bold text-slate-900 truncate">{file.name}</p>
                      <p className="text-[11px] text-slate-500 font-mono tabular-nums truncate">
                        {file.size} • Shared by {file.senderName} • {file.timestamp}
                      </p>
                    </div>
                  </div>

                  <Tooltip content="Download file">
                    <button
                      type="button"
                      onClick={() => handleDownloadFile(file.name)}
                      className="p-2 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors cursor-pointer shrink-0"
                    >
                      <Download className="w-4 h-4" />
                    </button>
                  </Tooltip>
                </div>
              ))}

              {groupFiles.length === 0 && (
                <div className="py-10 text-center space-y-2">
                  <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-400 mx-auto flex items-center justify-center">
                    <FileText className="w-5 h-5" />
                  </div>
                  <p className="text-xs text-slate-600 font-medium">No files shared yet</p>
                  <p className="text-[11px] text-slate-400">
                    Documents sent in chat messages will appear here.
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── TAB 3: TASKS ── */}
        {activeTab === "tasks" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                  Associated Care Tasks
                </h4>
                <p className="text-xs text-slate-500 mt-0.5">
                  Protocol checklists and deliverables for this care pathway
                </p>
              </div>
            </div>

            <div className="space-y-2.5">
              {groupTasks.map((task) => {
                const totalItems = task.checklists?.reduce(
                  (acc, c) => acc + (c.items?.length || 0),
                  0
                ) || 0;
                const completedItems = task.checklists?.reduce(
                  (acc, c) => acc + (c.items?.filter((i) => i.isCompleted).length || 0),
                  0
                ) || 0;

                const isCompleted = task.status === "completed";

                return (
                  <div
                    key={task.id}
                    className="p-3.5 bg-white border border-slate-200/80 rounded-xl space-y-2.5 shadow-2xs hover:border-slate-300 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <h5 className="text-xs font-bold text-slate-900 leading-snug">
                        {task.title}
                      </h5>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 ${
                          isCompleted
                            ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                            : "bg-blue-50 text-blue-700 border border-blue-200"
                        }`}
                      >
                        {isCompleted ? "Completed" : "In Progress"}
                      </span>
                    </div>

                    <div className="flex items-center gap-3 flex-wrap text-[11px] text-slate-500">
                      {task.project && (
                        <span className="font-medium text-slate-700 bg-slate-100 px-2 py-0.5 rounded-md">
                          {task.project}
                        </span>
                      )}

                      {task.deadline && (
                        <div className="flex items-center gap-1 font-mono tabular-nums">
                          <Calendar className="w-3.5 h-3.5 text-slate-400" />
                          <span>{task.deadline}</span>
                        </div>
                      )}

                      {totalItems > 0 && (
                        <div className="flex items-center gap-1 font-mono tabular-nums ml-auto text-slate-700 font-semibold">
                          <CheckSquare className="w-3.5 h-3.5 text-slate-400" />
                          <span>
                            {completedItems}/{totalItems} done
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}

              {groupTasks.length === 0 && (
                <div className="py-10 text-center space-y-2">
                  <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-400 mx-auto flex items-center justify-center">
                    <CheckSquare className="w-5 h-5" />
                  </div>
                  <p className="text-xs text-slate-600 font-medium">No tasks assigned yet</p>
                  <p className="text-[11px] text-slate-400">
                    Protocol tasks created for this group will be listed here.
                  </p>
                </div>
              )}
            </div>
          </div>
        )}
      </DrawerShell>

      {/* ── Confirmation Modal for Leaving Group ── */}
      {showLeaveConfirm && (
        <div className="fixed inset-0 z-[700] flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-sm w-full p-5 shadow-2xl border border-slate-200 space-y-4">
            <div className="w-10 h-10 rounded-xl bg-red-50 text-red-600 flex items-center justify-center border border-red-100">
              <AlertTriangle className="w-5 h-5" />
            </div>

            <div>
              <h3
                className="text-base font-bold text-slate-900"
                style={{ fontFamily: "Outfit, sans-serif" }}
              >
                Leave Care Group?
              </h3>
              <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                Are you sure you want to leave <strong>{conversation.contactName}</strong>? You will no longer receive care updates, shared files, or messages from this group.
              </p>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowLeaveConfirm(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowLeaveConfirm(false);
                  onLeaveGroup();
                }}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-white bg-red-600 hover:bg-red-700 shadow-xs transition-colors cursor-pointer flex items-center gap-1.5"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Yes, Leave Group</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
