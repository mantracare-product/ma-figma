import React, { useState, useEffect } from "react";
import { Drawer } from "../ui/drawer";
import { Button } from "../ui/Button";
import { Input } from "../ui/Input";
import {
  Shield, Plus, AlertCircle, Users, Trash2, Search, ChevronDown, Check, X, UserCheck
} from "lucide-react";
import { toast } from "sonner";
import type { Role, ItemPermissions } from "../../../types/permissions";
import { createDefaultPermissions } from "../../pages/settings-constants";

// ── Team Member Type & Default Seed Store ─────────────────────────────────────
export interface TeamMember {
  id: string;
  name: string;
  email: string;
  role: string;
  department?: string;
}

const TEAM_MEMBERS_KEY = "ma_team_members";

const DEFAULT_TEAM_MEMBERS: TeamMember[] = [
  { id: "tm_1", name: "John Smith", email: "john.smith@healthcare.com", role: "Admin", department: "Engineering" },
  { id: "tm_2", name: "Sarah Johnson", email: "sarah.j@healthcare.com", role: "Admin", department: "Medical" },
  { id: "tm_3", name: "Emily Davis", email: "emily.d@healthcare.com", role: "Manager", department: "Sales" },
  { id: "tm_4", name: "Dr. Robert Martinez", email: "robert.m@healthcare.com", role: "Manager", department: "Medical" },
  { id: "tm_5", name: "Lisa Anderson", email: "lisa.a@healthcare.com", role: "Reception", department: "Reception" },
  { id: "tm_6", name: "John Agent", email: "john.agent@healthcare.com", role: "Sales", department: "Sales" },
  { id: "tm_7", name: "Alex Turner", email: "alex.t@healthcare.com", role: "Sales", department: "Sales" },
];

export function getStoredTeamMembersList(): TeamMember[] {
  try {
    const raw = localStorage.getItem(TEAM_MEMBERS_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return DEFAULT_TEAM_MEMBERS;
}

export function saveStoredTeamMembersList(members: TeamMember[]) {
  try {
    localStorage.setItem(TEAM_MEMBERS_KEY, JSON.stringify(members));
  } catch {}
}

// ── Props ─────────────────────────────────────────────────────────────────────
interface CreateRoleDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  roles: Role[];
  onSaveRoles: (roles: Role[]) => void;
  /** Pre-populate for editing */
  editingRole?: Role | null;
  /** Map of role ID → number of assigned team members */
  assignedUserCounts?: Record<string, number>;
  zIndex?: number;
}

// ── Component ─────────────────────────────────────────────────────────────────
export function CreateRoleDrawer({
  isOpen,
  onClose,
  roles,
  onSaveRoles,
  editingRole = null,
  assignedUserCounts = {},
  zIndex = 10050,
}: CreateRoleDrawerProps) {
  // Form State
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [nameError, setNameError] = useState("");
  const [currentEditingRole, setCurrentEditingRole] = useState<Role | null>(null);

  // Team Members Assignment State
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [assignDropdownOpen, setAssignDropdownOpen] = useState(false);
  const [memberSearch, setMemberSearch] = useState("");

  useEffect(() => {
    if (isOpen) {
      setNameError("");
      setAssignDropdownOpen(false);
      setMemberSearch("");

      // Load live team members from store
      const members = getStoredTeamMembersList();
      setTeamMembers(members);

      if (editingRole) {
        setCurrentEditingRole(editingRole);
        setName(editingRole.name);
        setDescription(editingRole.description || "");
      } else {
        setCurrentEditingRole(null);
        setName("");
        setDescription("");
      }
    }
  }, [isOpen, editingRole]);

  // Derived assigned and available members
  const assignedMembers = currentEditingRole
    ? teamMembers.filter((m) => m.role.toLowerCase() === currentEditingRole.name.toLowerCase())
    : [];

  const availableToAssign = currentEditingRole
    ? teamMembers.filter(
        (m) =>
          m.role.toLowerCase() !== currentEditingRole.name.toLowerCase() &&
          (m.name.toLowerCase().includes(memberSearch.toLowerCase()) ||
            m.email.toLowerCase().includes(memberSearch.toLowerCase()))
      )
    : [];

  // Remove member from role
  const handleRemoveMember = (memberId: string) => {
    if (!currentEditingRole) return;
    const target = teamMembers.find((m) => m.id === memberId);
    if (!target) return;

    const updated = teamMembers.map((m) =>
      m.id === memberId ? { ...m, role: "Unassigned" } : m
    );
    setTeamMembers(updated);
    saveStoredTeamMembersList(updated);
    toast.success(`Removed ${target.name} from ${currentEditingRole.name} role.`);
  };

  // Assign member to role (Enforces SINGLE role per employee constraint)
  const handleAssignMember = (memberId: string) => {
    if (!currentEditingRole) return;
    const target = teamMembers.find((m) => m.id === memberId);
    if (!target) return;

    const oldRole = target.role;
    const updated = teamMembers.map((m) =>
      m.id === memberId ? { ...m, role: currentEditingRole.name } : m
    );
    setTeamMembers(updated);
    saveStoredTeamMembersList(updated);
    setAssignDropdownOpen(false);
    setMemberSearch("");
    toast.success(`Assigned ${target.name} to ${currentEditingRole.name} (reassigned from ${oldRole || "Unassigned"}).`);
  };

  const handleSave = () => {
    const trimmed = name.trim();
    if (!trimmed) { setNameError("Role name is required."); return; }

    const duplicate = roles.find(
      (r) => r.name.toLowerCase() === trimmed.toLowerCase() && r.id !== currentEditingRole?.id
    );
    if (duplicate) { setNameError("A role with this name already exists."); return; }

    let updatedRoles: Role[];
    if (currentEditingRole) {
      const oldRoleName = currentEditingRole.name;
      updatedRoles = roles.map((r) =>
        r.id === currentEditingRole.id
          ? { ...r, name: trimmed, description: description.trim() }
          : r
      );

      // If role name changed, update team members with old role name to new role name
      if (oldRoleName !== trimmed) {
        const updatedMembers = teamMembers.map((m) =>
          m.role.toLowerCase() === oldRoleName.toLowerCase() ? { ...m, role: trimmed } : m
        );
        setTeamMembers(updatedMembers);
        saveStoredTeamMembersList(updatedMembers);
      }

      toast.success(`Role "${trimmed}" updated.`);
    } else {
      const newRole: Role = {
        id: "custom_" + Date.now(),
        name: trimmed,
        description: description.trim(),
        isDefault: false,
        permissions: createDefaultPermissions() as unknown as ItemPermissions,
      };
      updatedRoles = [...roles, newRole];
      toast.success(`Role "${trimmed}" created.`);
    }
    onSaveRoles(updatedRoles);
    resetForm();
    onClose();
  };

  const resetForm = () => {
    setCurrentEditingRole(null);
    setName("");
    setDescription("");
    setNameError("");
    setAssignDropdownOpen(false);
    setMemberSearch("");
  };

  return (
    <Drawer
      isOpen={isOpen}
      onClose={onClose}
      maxWidth="max-w-[42vw] w-[42vw]"
      zIndex={zIndex}
      title={
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center">
            <Shield className="w-4 h-4 text-slate-800" />
          </div>
          <div>
            <div className="text-base font-bold text-slate-900" style={{ fontFamily: "Outfit, sans-serif" }}>
              {currentEditingRole ? "Edit Role" : "Create Role"}
            </div>
            <div className="text-[11px] text-slate-400 font-normal" style={{ fontFamily: "Outfit, sans-serif" }}>
              Configure role details and manage assigned team members
            </div>
          </div>
        </div>
      }
    >
      <div className="space-y-5 p-1 pb-32" style={{ fontFamily: "Outfit, sans-serif" }}>
        {/* ── ROLE EDIT / CREATE CARD ── */}
        <div className="bg-white border border-slate-200/90 rounded-2xl shadow-2xs">
          <div className="px-4 py-3 bg-slate-50 flex items-center justify-between border-b border-slate-100">
            <div className="flex items-center gap-2.5">
              <div className="w-6 h-6 rounded-lg bg-slate-900 flex items-center justify-center">
                <Plus className="w-3.5 h-3.5 text-white" />
              </div>
              <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                {currentEditingRole ? `Edit Role: ${currentEditingRole.name}` : "Create New Role"}
              </span>
            </div>
          </div>

          <div className="p-4 space-y-4 bg-white">
            {/* Role Name */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Role Name <span className="text-red-500">*</span>
              </label>
              <Input
                value={name}
                onChange={(e) => { setName(e.target.value); setNameError(""); }}
                placeholder="e.g. Sales Manager, Reception"
                className="w-full text-xs bg-white border-slate-200"
              />
              {nameError && (
                <p className="text-xs text-red-500 mt-1 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" /> {nameError}
                </p>
              )}
            </div>

            {/* Role Description */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Description <span className="text-slate-400 font-normal">(optional)</span>
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Briefly describe what this role is responsible for..."
                rows={2}
                className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:border-slate-500 bg-white resize-none"
              />
            </div>

            {/* ── ASSIGNED TEAM MEMBERS SECTION (only when editing role) ── */}
            {currentEditingRole && (
              <div className="space-y-3 pt-3 border-t border-slate-100">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Users className="w-4 h-4 text-slate-700" />
                    <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                      Assigned Team Members ({assignedMembers.length})
                    </span>
                  </div>
                  <span className="text-[10px] font-medium text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">
                    Single role per employee
                  </span>
                </div>

                {/* List of assigned members */}
                {assignedMembers.length > 0 ? (
                  <div className="space-y-1.5 max-h-44 overflow-y-auto pr-1 divide-y divide-slate-100 border border-slate-200/80 rounded-xl p-1.5 bg-slate-50/50">
                    {assignedMembers.map((member) => (
                      <div
                        key={member.id}
                        className="flex items-center justify-between p-2 rounded-lg bg-white border border-slate-100 hover:border-slate-200 transition-colors"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="w-7 h-7 rounded-lg bg-slate-900 text-white font-bold text-xs flex items-center justify-center shrink-0">
                            {member.name.charAt(0)}
                          </div>
                          <div className="min-w-0">
                            <div className="text-xs font-bold text-slate-800 truncate">
                              {member.name}
                            </div>
                            <div className="text-[10px] text-slate-400 truncate">
                              {member.email}
                            </div>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => handleRemoveMember(member.id)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors cursor-pointer flex items-center gap-1"
                          title={`Remove ${member.name} from ${currentEditingRole.name}`}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="px-3 py-3 text-center text-xs text-slate-400 italic bg-slate-50 border border-slate-200/60 rounded-xl">
                    No team members assigned to this role yet.
                  </div>
                )}

                {/* Assign New Team Member Dropdown */}
                <div className="space-y-1.5 pt-1">
                  <label className="block text-xs font-semibold text-slate-700">
                    Assign Team Member to {currentEditingRole.name}
                  </label>
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => setAssignDropdownOpen((v) => !v)}
                      className="w-full flex items-center justify-between px-3 py-2 text-xs bg-white border border-slate-200 rounded-xl hover:border-slate-400 focus:outline-none transition-colors cursor-pointer"
                    >
                      <span className="text-slate-600 font-medium">
                        + Select team member to assign...
                      </span>
                      <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform ${assignDropdownOpen ? "rotate-180" : ""}`} />
                    </button>

                    {assignDropdownOpen && (
                      <div className="absolute z-[9999] top-full mt-1.5 left-0 w-full bg-white border border-slate-200 rounded-xl shadow-2xl overflow-hidden animate-in fade-in-50 zoom-in-95 duration-150">
                        {/* Search Input */}
                        <div className="p-2 border-b border-slate-100 bg-slate-50/50 relative flex items-center">
                          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-4" />
                          <input
                            type="text"
                            value={memberSearch}
                            onChange={(e) => setMemberSearch(e.target.value)}
                            placeholder="Search team members..."
                            className="w-full pl-7 pr-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-slate-500"
                            autoFocus
                          />
                        </div>

                        <div className="max-h-44 overflow-y-auto divide-y divide-slate-100 p-1">
                          {availableToAssign.length > 0 ? (
                            availableToAssign.map((member) => (
                              <button
                                key={member.id}
                                type="button"
                                onClick={() => handleAssignMember(member.id)}
                                className="w-full text-left p-2 rounded-lg hover:bg-slate-50 flex items-center justify-between transition-colors cursor-pointer"
                              >
                                <div className="flex items-center gap-2 min-w-0">
                                  <div className="w-6 h-6 rounded-md bg-slate-100 text-slate-700 font-bold text-xs flex items-center justify-center shrink-0">
                                    {member.name.charAt(0)}
                                  </div>
                                  <div className="min-w-0">
                                    <div className="text-xs font-semibold text-slate-800 truncate">{member.name}</div>
                                    <div className="text-[10px] text-slate-400 truncate">{member.email}</div>
                                  </div>
                                </div>
                                <div className="text-[10px] font-medium px-2 py-0.5 rounded bg-slate-100 text-slate-600 border border-slate-200 shrink-0 ml-2">
                                  Current: {member.role || "Unassigned"}
                                </div>
                              </button>
                            ))
                          ) : (
                            <div className="px-3 py-3 text-[11px] text-slate-400 italic text-center">
                              No other team members available.
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Form Buttons */}
            <div className="flex items-center gap-2 pt-2 border-t border-slate-100">
              <Button variant="outline" onClick={onClose} className="text-xs flex-1 cursor-pointer">
                Cancel
              </Button>
              <Button variant="primary" onClick={handleSave} className="text-xs font-bold flex-1 bg-slate-900 hover:bg-slate-800 text-white cursor-pointer">
                {currentEditingRole ? "Save Changes" : "Create Role"}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </Drawer>
  );
}
