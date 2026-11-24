import React, { useState, useEffect, useMemo } from "react";
import { Drawer } from "../ui/drawer";
import { Plus, Shield, Search, Check, User } from "lucide-react";
import { toast } from "sonner";
import type { Department, Role } from "../../../types/permissions";
import {
  getStoredDepartments,
  saveStoredDepartments,
  DEPARTMENTS_KEY,
} from "../../../lib/departmentStore";
import { saveStoredTeamMembers } from "../../../lib/teamStore";

export { getStoredDepartments, saveStoredDepartments, DEPARTMENTS_KEY };

export interface GenericRoleLike {
  id?: string;
  name?: string;
  roleName?: string;
  department?: string;
  description?: string;
  [key: string]: any;
}

// ── Props ─────────────────────────────────────────────────────────────────────
export interface DepartmentDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  roles?: any[];
  users?: any[];
  onDepartmentsChange?: (deps: Department[]) => void;
  onRolesChange?: (roles: any[]) => void;
  onUsersChange?: (users: any[]) => void;
  initialEditDepartment?: Department | null;
  zIndex?: number;
}

// ── Component ─────────────────────────────────────────────────────────────────
export function DepartmentDrawer({
  isOpen,
  onClose,
  roles = [],
  users = [],
  onDepartmentsChange,
  onRolesChange,
  onUsersChange,
  initialEditDepartment = null,
  zIndex = 10100,
}: DepartmentDrawerProps) {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [name, setName] = useState("");
  const [desc, setDesc] = useState("");
  const [selectedRoleIds, setSelectedRoleIds] = useState<Set<string>>(new Set());
  const [roleSearch, setRoleSearch] = useState("");
  const [selectedUserIds, setSelectedUserIds] = useState<Set<string>>(new Set());
  const [userSearch, setUserSearch] = useState("");

  useEffect(() => {
    if (isOpen) {
      const stored = getStoredDepartments();
      setDepartments(stored);
      setRoleSearch("");
      setUserSearch("");

      if (initialEditDepartment) {
        setName(initialEditDepartment.name);
        setDesc(initialEditDepartment.description || "");

        // Pre-select roles already assigned to this department
        const targetDeptName = initialEditDepartment.name.toLowerCase();
        const initialSelectedRoles = new Set<string>();
        roles.forEach((r) => {
          const rDept = (r.department || "").toLowerCase();
          const rId = r.id || r.name;
          if (rDept === targetDeptName && rId) {
            initialSelectedRoles.add(String(rId));
          }
        });
        setSelectedRoleIds(initialSelectedRoles);

        // Pre-select users already assigned to this department
        const initialSelectedUsers = new Set<string>();
        users.forEach((u) => {
          const uDepts: string[] = Array.isArray(u.departments)
            ? u.departments
            : (u.department || "").split(",").map((s: string) => s.trim()).filter(Boolean);
          if (uDepts.some((d: string) => d.toLowerCase() === targetDeptName)) {
            initialSelectedUsers.add(String(u.id));
          }
        });
        setSelectedUserIds(initialSelectedUsers);
      } else {
        setName("");
        setDesc("");
        setSelectedRoleIds(new Set());
        setSelectedUserIds(new Set());
      }
    }
  }, [isOpen, initialEditDepartment, roles, users]);

  const toggleRole = (roleId: string) => {
    setSelectedRoleIds((prev) => {
      const next = new Set(prev);
      if (next.has(roleId)) {
        next.delete(roleId);
      } else {
        next.add(roleId);
      }
      return next;
    });
  };

  const toggleUser = (userId: string) => {
    setSelectedUserIds((prev) => {
      const next = new Set(prev);
      if (next.has(userId)) {
        next.delete(userId);
      } else {
        next.add(userId);
      }
      return next;
    });
  };

  const handleSave = () => {
    const trimmed = name.trim();
    if (!trimmed) {
      toast.error("Department name is required.");
      return;
    }

    const isDuplicate = departments.some(
      (d) =>
        d.name.toLowerCase() === trimmed.toLowerCase() &&
        (!initialEditDepartment || d.id !== initialEditDepartment.id)
    );
    if (isDuplicate) {
      toast.error("A department with this name already exists.");
      return;
    }

    let updatedDepts: Department[];
    if (initialEditDepartment) {
      updatedDepts = departments.map((d) =>
        d.id === initialEditDepartment.id
          ? { ...d, name: trimmed, description: desc.trim() }
          : d
      );
    } else {
      const newDept: Department = {
        id: "dept_" + Date.now(),
        name: trimmed,
        description: desc.trim(),
      };
      updatedDepts = [...departments, newDept];
    }

    // Persist departments
    setDepartments(updatedDepts);
    saveStoredDepartments(updatedDepts);
    onDepartmentsChange?.(updatedDepts);

    // Update users mapping
    if (users && users.length > 0) {
      const prevDeptName = initialEditDepartment?.name?.toLowerCase() || "";
      const updatedUsers = users.map((u) => {
        const uId = String(u.id);
        const currentDepts: string[] = Array.isArray(u.departments)
          ? [...u.departments]
          : (u.department || "").split(",").map((s: string) => s.trim()).filter(Boolean);

        if (selectedUserIds.has(uId)) {
          // Assign to department if not already present
          if (!currentDepts.some((d) => d.toLowerCase() === trimmed.toLowerCase())) {
            currentDepts.push(trimmed);
          }
        } else {
          // Remove department if unchecked
          const targetIndex = currentDepts.findIndex(
            (d) => d.toLowerCase() === trimmed.toLowerCase() || (prevDeptName && d.toLowerCase() === prevDeptName)
          );
          if (targetIndex >= 0) {
            currentDepts.splice(targetIndex, 1);
          }
        }

        return {
          ...u,
          departments: currentDepts,
          department: currentDepts.join(", "),
        };
      });

      onUsersChange?.(updatedUsers);
      saveStoredTeamMembers(updatedUsers);
    }

    // Update roles mapping
    if (roles && roles.length > 0) {
      const prevDeptName = initialEditDepartment?.name?.toLowerCase() || "";
      const updatedRoles = roles.map((r) => {
        const rId = String(r.id || r.name);
        const currentDept = (r.department || "").toLowerCase();

        if (selectedRoleIds.has(rId)) {
          // Assign to this department
          return { ...r, department: trimmed };
        } else if (prevDeptName && currentDept === prevDeptName) {
          // Unassigned from this department
          return { ...r, department: undefined };
        }
        return r;
      });

      onRolesChange?.(updatedRoles);
      try {
        sessionStorage.setItem("settings_roles", JSON.stringify(updatedRoles));
      } catch {}
    }

    toast.success(
      initialEditDepartment
        ? `Department "${trimmed}" updated successfully.`
        : `Department "${trimmed}" created successfully.`
    );
    onClose();
  };

  const filteredUsers = useMemo(() => {
    if (!userSearch.trim()) return users;
    const query = userSearch.toLowerCase();
    return users.filter(
      (u) =>
        (u.name && u.name.toLowerCase().includes(query)) ||
        (u.email && u.email.toLowerCase().includes(query)) ||
        (u.role && u.role.toLowerCase().includes(query))
    );
  }, [users, userSearch]);

  const filteredRoles = useMemo(() => {
    if (!roleSearch.trim()) return roles;
    const query = roleSearch.toLowerCase();
    return roles.filter(
      (r) =>
        (r.name && r.name.toLowerCase().includes(query)) ||
        (r.roleName && r.roleName.toLowerCase().includes(query)) ||
        (r.description && r.description.toLowerCase().includes(query))
    );
  }, [roles, roleSearch]);

  return (
    <Drawer
      isOpen={isOpen}
      onClose={onClose}
      title={
        <div>
          <div className="text-base font-bold text-slate-900" style={{ fontFamily: "Outfit, sans-serif" }}>
            {initialEditDepartment ? "Edit Department" : "Create Department"}
          </div>
          <div className="text-[11px] text-slate-400 font-normal" style={{ fontFamily: "Outfit, sans-serif" }}>
            {initialEditDepartment
              ? "Update department details, assigned users, and permissions"
              : "Add a department and assign users and permissions to it"}
          </div>
        </div>
      }
      maxWidth="max-w-[42vw] w-[42vw]"
      zIndex={zIndex}
    >
      <div className="space-y-6 pb-6" style={{ fontFamily: "Outfit, sans-serif" }}>
        {/* Department Name & Description Form */}
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider mb-1.5">
              Department Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Clinical Operations, Marketing, Finance..."
              className="w-full h-10 px-3.5 text-xs border border-slate-200 rounded-xl bg-white focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20 transition-colors shadow-2xs font-medium text-slate-900"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider mb-1.5">
              Description <span className="text-slate-400 font-normal lowercase">(optional)</span>
            </label>
            <textarea
              rows={2}
              value={desc}
              onChange={(e) => setDesc(e.target.value)}
              placeholder="Brief description of department scope and responsibilities..."
              className="w-full px-3.5 py-2.5 text-xs border border-slate-200 rounded-xl bg-white focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20 transition-colors shadow-2xs text-slate-700 resize-none"
            />
          </div>
        </div>

        {/* Assign Users in Department Section */}
        {users && users.length > 0 && (
          <div className="space-y-3 pt-1">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                  Assign Users
                </p>
                <p className="text-[11px] text-slate-400">
                  Select team members who belong to this department
                </p>
              </div>
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-blue-50 text-blue-700 border border-blue-100">
                <User className="w-3 h-3 text-blue-500" />
                {selectedUserIds.size} assigned
              </span>
            </div>

            {/* Quick Search for Users */}
            {users.length > 3 && (
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  value={userSearch}
                  onChange={(e) => setUserSearch(e.target.value)}
                  placeholder="Search team members..."
                  className="w-full h-9 pl-9 pr-3 text-xs border border-slate-200 rounded-xl bg-slate-50 focus:bg-white focus:outline-none focus:border-blue-500 transition-colors"
                />
              </div>
            )}

            {/* Users List */}
            <div className="border border-slate-200 rounded-2xl overflow-hidden bg-white shadow-2xs divide-y divide-slate-100 max-h-[220px] overflow-y-auto">
              {filteredUsers.length === 0 ? (
                <div className="p-4 text-center text-xs text-slate-400">
                  No users found.
                </div>
              ) : (
                filteredUsers.map((u) => {
                  const uId = String(u.id);
                  const isSelected = selectedUserIds.has(uId);
                  const userDepts: string[] = Array.isArray(u.departments)
                    ? u.departments
                    : (u.department || "").split(",").map((s: string) => s.trim()).filter(Boolean);
                  const otherDepts = userDepts.filter(
                    (d: string) => d.toLowerCase() !== (initialEditDepartment?.name || "").toLowerCase()
                  );

                  return (
                    <label
                      key={uId}
                      className={`flex items-center gap-3 p-3 cursor-pointer transition-colors ${
                        isSelected ? "bg-blue-50/40" : "hover:bg-slate-50/70"
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleUser(uId)}
                        className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500/20 cursor-pointer accent-blue-600 shrink-0"
                      />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-slate-900">{u.name}</span>
                          {u.role && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 font-medium">
                              {u.role}
                            </span>
                          )}
                          {otherDepts.length > 0 && !isSelected && (
                            <span className="text-[10px] text-slate-400 font-medium">
                              (in {otherDepts.join(", ")})
                            </span>
                          )}
                        </div>
                        {u.email && (
                          <p className="text-[11px] text-slate-500 truncate">{u.email}</p>
                        )}
                      </div>
                    </label>
                  );
                })
              )}
            </div>
          </div>
        )}

        {/* Roles in Department Section */}
        <div className="space-y-3 pt-1">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                Add Roles in the Department
              </p>
              <p className="text-[11px] text-slate-400">
                Select roles that belong to this department
              </p>
            </div>
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-blue-50 text-blue-700 border border-blue-100">
              <Shield className="w-3 h-3 text-blue-500" />
              {selectedRoleIds.size} selected
            </span>
          </div>

          {/* Quick Search */}
          {roles.length > 3 && (
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={roleSearch}
                onChange={(e) => setRoleSearch(e.target.value)}
                placeholder="Search available roles..."
                className="w-full h-9 pl-9 pr-3 text-xs border border-slate-200 rounded-xl bg-slate-50 focus:bg-white focus:outline-none focus:border-blue-500 transition-colors"
              />
            </div>
          )}

          {/* Roles List */}
          <div className="border border-slate-200 rounded-2xl overflow-hidden bg-white shadow-2xs divide-y divide-slate-100 max-h-[320px] overflow-y-auto">
            {filteredRoles.length === 0 ? (
              <div className="p-6 text-center text-xs text-slate-400">
                No roles found.
              </div>
            ) : (
              filteredRoles.map((r) => {
                const rId = String(r.id || r.name);
                const isSelected = selectedRoleIds.has(rId);
                const roleName = r.name || r.roleName || "Untitled Role";
                const isAssignedElsewhere =
                  r.department &&
                  r.department.toLowerCase() !== (initialEditDepartment?.name || "").toLowerCase();

                return (
                  <label
                    key={rId}
                    className={`flex items-start gap-3 p-3.5 cursor-pointer transition-colors ${
                      isSelected ? "bg-blue-50/40" : "hover:bg-slate-50/70"
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => toggleRole(rId)}
                      className="mt-0.5 w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500/20 cursor-pointer accent-blue-600 shrink-0"
                    />
                    <div className="min-w-0 flex-1 space-y-0.5">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-slate-900">{roleName}</span>
                        {isAssignedElsewhere && !isSelected && (
                          <span className="text-[10px] text-slate-400 font-medium">
                            (Currently in {r.department})
                          </span>
                        )}
                      </div>
                      {r.description ? (
                        <p className="text-[11px] text-slate-500 leading-snug line-clamp-2">
                          {r.description}
                        </p>
                      ) : (
                        <p className="text-[11px] text-slate-300 italic">No description</p>
                      )}
                    </div>
                  </label>
                );
              })
            )}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 text-xs font-semibold text-slate-600 hover:text-slate-900 rounded-xl hover:bg-slate-100 transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={!name.trim()}
            className="flex items-center gap-1.5 px-5 py-2.5 text-xs font-bold bg-slate-900 text-white rounded-xl hover:bg-slate-800 transition-colors disabled:opacity-40 cursor-pointer shadow-2xs"
          >
            {initialEditDepartment ? (
              <>
                <Check className="w-3.5 h-3.5" />
                Save Department
              </>
            ) : (
              <>
                <Plus className="w-3.5 h-3.5" />
                Add Department
              </>
            )}
          </button>
        </div>
      </div>
    </Drawer>
  );
}
