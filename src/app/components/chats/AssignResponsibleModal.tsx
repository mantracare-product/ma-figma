import React, { useState, useMemo, useEffect } from "react";
import { X, Search, UserCheck, UserX, Check, Shield } from "lucide-react";
import { getStoredTeamMembers, TeamMember } from "../../../lib/teamStore";

export interface AssignResponsibleModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentAssignedId?: string;
  contactName?: string;
  onAssign: (personId: string, personName: string) => void;
}

const DEFAULT_RESPONSIBLES: Array<{
  id: string;
  name: string;
  role: string;
  department: string;
  email: string;
}> = [
  { id: "1", name: "Sarah Johnson", role: "Care Coordinator", department: "Patient Care", email: "sarah.j@mantra.care" },
  { id: "2", name: "Michael Chen", role: "Lead Practitioner", department: "Clinical Care", email: "m.chen@mantra.care" },
  { id: "3", name: "Emily Rodriguez", role: "Patient Specialist", department: "Support Operations", email: "emily.r@mantra.care" },
  { id: "4", name: "James Wilson", role: "Medical Officer", department: "Clinical Team", email: "j.wilson@mantra.care" },
  { id: "5", name: "Lisa Thompson", role: "Billing & Intake Manager", department: "Administration", email: "lisa.t@mantra.care" },
  { id: "6", name: "John Smith", role: "Attending Doctor", department: "General Medicine", email: "john.smith@mantra.care" },
  { id: "7", name: "Amanda Taylor", role: "Care Specialist", department: "Patient Intake", email: "amanda.t@mantra.care" },
  { id: "8", name: "David Martinez", role: "Case Manager", department: "Operations", email: "d.martinez@mantra.care" },
  { id: "9", name: "Robert Wilson", role: "Account Specialist", department: "Operations", email: "robert.w@mantra.care" },
  { id: "10", name: "Emily Davis", role: "Intake Officer", department: "Patient Services", email: "emily.d@mantra.care" },
];

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

export default function AssignResponsibleModal({
  isOpen,
  onClose,
  currentAssignedId = "",
  contactName,
  onAssign,
}: AssignResponsibleModalProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [members, setMembers] = useState<Array<{ id: string; name: string; role: string; department: string; email: string }>>([]);

  useEffect(() => {
    if (!isOpen) {
      setSearchQuery("");
      return;
    }

    try {
      const stored = getStoredTeamMembers();
      const list: Array<{ id: string; name: string; role: string; department: string; email: string }> = [];

      // Add stored members if valid
      if (Array.isArray(stored) && stored.length > 0) {
        stored.forEach((m) => {
          if (m && m.name) {
            list.push({
              id: String(m.id),
              name: m.name,
              role: m.role || "Team Member",
              department: m.department || "General",
              email: m.email || "",
            });
          }
        });
      }

      // Merge with default responsibles
      DEFAULT_RESPONSIBLES.forEach((def) => {
        const alreadyExists = list.some(
          (item) => item.id === def.id || item.name.toLowerCase() === def.name.toLowerCase()
        );
        if (!alreadyExists) {
          list.push(def);
        }
      });

      setMembers(list);
    } catch {
      setMembers(DEFAULT_RESPONSIBLES);
    }
  }, [isOpen]);

  const filteredMembers = useMemo(() => {
    if (!searchQuery.trim()) return members;
    const q = searchQuery.toLowerCase().trim();
    return members.filter(
      (m) =>
        m.name.toLowerCase().includes(q) ||
        m.role.toLowerCase().includes(q) ||
        m.department.toLowerCase().includes(q) ||
        m.email.toLowerCase().includes(q)
    );
  }, [members, searchQuery]);

  if (!isOpen) return null;

  const isAssigned = (id: string, name: string) => {
    if (!currentAssignedId) return false;
    return String(currentAssignedId) === String(id) || currentAssignedId.toLowerCase() === name.toLowerCase();
  };

  const handleSelect = (personId: string, personName: string) => {
    onAssign(personId, personName);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4 animate-in fade-in duration-200">
      <div
        className="bg-white rounded-2xl max-w-lg w-full shadow-2xl overflow-hidden flex flex-col max-h-[85vh] border border-gray-200 animate-in zoom-in-95 duration-150"
        style={{ fontFamily: "Outfit, sans-serif" }}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-slate-50/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-[#1456f0] border border-blue-200/60 flex items-center justify-center shrink-0">
              <UserCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-gray-900 leading-tight">
                Assign Responsible
              </h3>
              <p className="text-xs text-gray-500 mt-0.5">
                {contactName ? `Assign a specialist to handle messages with ${contactName}` : "Select a team member to manage this chat"}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors cursor-pointer"
            title="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search Bar */}
        <div className="p-4 border-b border-gray-100 bg-white">
          <div className="relative">
            <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search team member by name, role, or department..."
              className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-gray-200 rounded-xl text-xs text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#1456f0]/20 focus:border-[#1456f0] transition-all"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-0.5 cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Member List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {/* Unassigned Option */}
          {!searchQuery.trim() && (
            <button
              type="button"
              onClick={() => handleSelect("", "")}
              className={`w-full p-3 rounded-xl border text-left flex items-center justify-between transition-all cursor-pointer ${
                !currentAssignedId
                  ? "bg-blue-50/70 border-blue-300 ring-1 ring-blue-400/30"
                  : "bg-white border-gray-200 hover:border-gray-300 hover:bg-slate-50"
              }`}
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-9 h-9 rounded-xl bg-slate-100 text-slate-500 border border-slate-200 flex items-center justify-center shrink-0">
                  <UserX className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-gray-900">Unassigned</span>
                    <span className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full font-medium">
                      Automated / Bot
                    </span>
                  </div>
                  <p className="text-[11px] text-gray-500 truncate mt-0.5">
                    No specialist assigned. Conversation remains open to all or handled by bot.
                  </p>
                </div>
              </div>
              {!currentAssignedId && (
                <span className="flex items-center gap-1 text-[11px] font-bold text-[#1456f0] shrink-0 bg-blue-100/70 px-2.5 py-1 rounded-full">
                  <Check className="w-3.5 h-3.5" />
                  Current
                </span>
              )}
            </button>
          )}

          {/* Filtered Team Members */}
          {filteredMembers.length === 0 ? (
            <div className="p-8 text-center text-gray-400 text-xs">
              No team members found matching "{searchQuery}".
            </div>
          ) : (
            filteredMembers.map((member) => {
              const active = isAssigned(member.id, member.name);
              const avatarCls = getAvatarColor(member.name);
              const initials = getInitials(member.name);

              return (
                <button
                  key={member.id}
                  type="button"
                  onClick={() => handleSelect(member.id, member.name)}
                  className={`w-full p-3 rounded-xl border text-left flex items-center justify-between transition-all cursor-pointer ${
                    active
                      ? "bg-blue-50/70 border-blue-300 ring-1 ring-blue-400/30"
                      : "bg-white border-gray-200 hover:border-blue-200 hover:bg-slate-50/80"
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={`w-9 h-9 rounded-xl font-bold text-xs flex items-center justify-center shrink-0 shadow-2xs ${avatarCls}`}>
                      {initials}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-gray-900 truncate">
                          {member.name}
                        </span>
                        <span className="text-[10px] bg-blue-50 text-[#1456f0] px-2 py-0.5 rounded-full font-semibold shrink-0 border border-blue-200/50">
                          {member.role}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 mt-0.5 text-[11px] text-gray-500">
                        {member.department && <span>{member.department}</span>}
                        {member.department && member.email && <span>·</span>}
                        {member.email && <span className="font-mono truncate">{member.email}</span>}
                      </div>
                    </div>
                  </div>

                  {active ? (
                    <span className="flex items-center gap-1 text-[11px] font-bold text-[#1456f0] shrink-0 bg-blue-100/70 px-2.5 py-1 rounded-full">
                      <Check className="w-3.5 h-3.5" />
                      Assigned
                    </span>
                  ) : (
                    <span className="text-[11px] font-semibold text-slate-400 group-hover:text-[#1456f0] opacity-0 hover:opacity-100 transition-opacity">
                      Assign
                    </span>
                  )}
                </button>
              );
            })
          )}
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-between px-6 py-3.5 border-t border-gray-100 bg-gray-50 text-xs">
          <span className="text-gray-500 flex items-center gap-1.5 text-[11px]">
            <Shield className="w-3.5 h-3.5 text-slate-400" />
            Assigning will notify the specialist and update conversation ownership.
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 font-medium text-gray-600 hover:bg-gray-200/70 rounded-xl transition-colors cursor-pointer"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
