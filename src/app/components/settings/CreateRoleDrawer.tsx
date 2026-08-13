import React, { useState, useEffect } from "react";
import { Drawer } from "../ui/drawer";
import { Button } from "../ui/Button";
import { Input } from "../ui/Input";
import {
  Shield, Plus, Edit2, Trash2, AlertCircle,
  Building2, ChevronDown, ChevronUp, X, Check, Search, Users
} from "lucide-react";
import { toast } from "sonner";
import { DepartmentDrawer } from "./DepartmentDrawer";
import type { Role, Department, ItemPermissions } from "../../../types/permissions";
import { createDefaultPermissions } from "../../pages/settings-constants";

// ── Dept store helpers ────────────────────────────────────────────────────────
const DEPARTMENTS_KEY = "ma_departments";

function getStoredDepartments(): Department[] {
  try {
    const raw = localStorage.getItem(DEPARTMENTS_KEY);
    return raw ? (JSON.parse(raw) as Department[]) : [];
  } catch { return []; }
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
  // Collapsible Form State
  const [roleFormOpen, setRoleFormOpen] = useState(true);

  // Form State
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [department, setDepartment] = useState("");
  const [nameError, setNameError] = useState("");
  const [currentEditingRole, setCurrentEditingRole] = useState<Role | null>(null);

  // Department picker & separate drawer state
  const [departments, setDepartments] = useState<Department[]>([]);
  const [deptDropdownOpen, setDeptDropdownOpen] = useState(false);
  const [deptDrawerOpen, setDeptDrawerOpen] = useState(false);

  // Search roles list
  const [search, setSearch] = useState("");

  useEffect(() => {
    if (isOpen) {
      setDepartments(getStoredDepartments());
      setNameError("");
      setSearch("");
      setDeptDropdownOpen(false);

      if (editingRole) {
        setCurrentEditingRole(editingRole);
        setName(editingRole.name);
        setDescription(editingRole.description || "");
        setDepartment(editingRole.department || "");
        setRoleFormOpen(true);
      } else {
        setCurrentEditingRole(null);
        setName("");
        setDescription("");
        setDepartment("");
        setRoleFormOpen(true);
      }
    }
  }, [isOpen, editingRole]);

  const handleSave = () => {
    const trimmed = name.trim();
    if (!trimmed) { setNameError("Role name is required."); return; }

    const duplicate = roles.find(
      (r) => r.name.toLowerCase() === trimmed.toLowerCase() && r.id !== currentEditingRole?.id
    );
    if (duplicate) { setNameError("A role with this name already exists."); return; }

    let updated: Role[];
    if (currentEditingRole) {
      updated = roles.map((r) =>
        r.id === currentEditingRole.id
          ? { ...r, name: trimmed, description: description.trim(), department: department || undefined }
          : r
      );
      toast.success(`Role "${trimmed}" updated.`);
    } else {
      const newRole: Role = {
        id: "custom_" + Date.now(),
        name: trimmed,
        description: description.trim(),
        department: department || undefined,
        isDefault: false,
        permissions: createDefaultPermissions() as unknown as ItemPermissions,
      };
      updated = [...roles, newRole];
      toast.success(`Role "${trimmed}" created.`);
    }
    onSaveRoles(updated);
    resetForm();
  };

  const resetForm = () => {
    setCurrentEditingRole(null);
    setName("");
    setDescription("");
    setDepartment("");
    setNameError("");
  };

  const handleStartEdit = (role: Role) => {
    setCurrentEditingRole(role);
    setName(role.name);
    setDescription(role.description || "");
    setDepartment(role.department || "");
    setRoleFormOpen(true);
  };

  const handleDelete = (id: string, roleName: string) => {
    if (window.confirm(`Delete role "${roleName}"? This action cannot be undone.`)) {
      onSaveRoles(roles.filter((r) => r.id !== id));
      toast.success(`Role "${roleName}" deleted.`);
    }
  };

  const filteredRoles = roles.filter((r) =>
    r.name.toLowerCase().includes(search.toLowerCase()) ||
    (r.department && r.department.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <>
      <Drawer
        isOpen={isOpen}
        onClose={onClose}
        maxWidth="max-w-[50vw] w-[50vw]"
        zIndex={zIndex}
        title={
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center">
              <Shield className="w-4 h-4 text-slate-800" />
            </div>
            <div>
              <div className="text-base font-bold text-slate-900" style={{ fontFamily: "Outfit, sans-serif" }}>
                Roles Management
              </div>
              <div className="text-[11px] text-slate-400 font-normal" style={{ fontFamily: "Outfit, sans-serif" }}>
                {roles.length} role{roles.length !== 1 ? "s" : ""} total
              </div>
            </div>
          </div>
        }
      >
        <div className="space-y-5" style={{ fontFamily: "Outfit, sans-serif" }}>

          {/* ── COLLAPSIBLE ROLE CREATION CARD ── */}
          <div className="bg-white border border-slate-200/90 rounded-2xl shadow-2xs overflow-hidden">
            <button
              type="button"
              onClick={() => setRoleFormOpen((v) => !v)}
              className="w-full px-4 py-3 bg-slate-50 flex items-center justify-between border-b border-slate-100 hover:bg-slate-100/60 transition-colors"
            >
              <div className="flex items-center gap-2.5">
                <div className="w-6 h-6 rounded-lg bg-slate-900 flex items-center justify-center">
                  <Plus className="w-3.5 h-3.5 text-white" />
                </div>
                <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                  {currentEditingRole ? `Edit Role: ${currentEditingRole.name}` : "Create New Role"}
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                {roleFormOpen ? (
                  <ChevronUp className="w-4 h-4 text-slate-400" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-slate-400" />
                )}
              </div>
            </button>

            {roleFormOpen && (
              <div className="p-4 space-y-3.5 bg-white">
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

                {/* Department Select Dropdown */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1.5">
                    <Building2 className="w-3.5 h-3.5 text-slate-500" />
                    Department <span className="text-slate-400 font-normal">(optional)</span>
                  </label>
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => setDeptDropdownOpen((v) => !v)}
                      className="w-full flex items-center justify-between px-3 py-2 text-xs bg-white border border-slate-200 rounded-xl hover:border-slate-400 focus:outline-none transition-colors"
                    >
                      <span className={department ? "text-slate-900 font-semibold" : "text-slate-400"}>
                        {department || "Select department..."}
                      </span>
                      <div className="flex items-center gap-1.5">
                        {department && (
                          <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); setDepartment(""); }}
                            className="text-slate-400 hover:text-slate-700"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        )}
                        <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform ${deptDropdownOpen ? "rotate-180" : ""}`} />
                      </div>
                    </button>

                    {deptDropdownOpen && (
                      <div className="absolute z-50 top-full mt-1.5 left-0 w-full bg-white border border-slate-200 rounded-xl shadow-xl overflow-hidden">
                        {departments.length > 0 ? (
                          <div className="max-h-44 overflow-y-auto divide-y divide-slate-100">
                            {departments.map((d) => (
                              <button
                                key={d.id}
                                type="button"
                                onClick={() => { setDepartment(d.name); setDeptDropdownOpen(false); }}
                                className="w-full text-left px-3.5 py-2.5 text-xs hover:bg-slate-50 flex flex-col gap-0.5 transition-colors"
                              >
                                <div className="flex items-center justify-between">
                                  <span className="font-semibold text-slate-800">{d.name}</span>
                                  {department === d.name && <Check className="w-3.5 h-3.5 text-slate-900" />}
                                </div>
                                {d.description && (
                                  <span className="text-[11px] text-slate-500 line-clamp-1">{d.description}</span>
                                )}
                              </button>
                            ))}
                          </div>
                        ) : (
                          <div className="px-3.5 py-3 text-[11px] text-slate-400 italic">
                            No departments created yet.
                          </div>
                        )}
                        {/* Option to open Department Drawer */}
                        <div className="border-t border-slate-100 p-1.5 bg-slate-50">
                          <button
                            type="button"
                            onClick={() => {
                              setDeptDropdownOpen(false);
                              setDeptDrawerOpen(true);
                            }}
                            className="w-full flex items-center gap-2 px-2.5 py-2 text-xs font-bold text-slate-900 hover:bg-slate-200/60 rounded-lg transition-colors"
                          >
                            <Plus className="w-3.5 h-3.5 text-slate-900" />
                            + Manage / Create Departments
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
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

                {/* Form Buttons */}
                <div className="flex items-center gap-2 pt-1">
                  {currentEditingRole && (
                    <Button variant="outline" onClick={resetForm} className="text-xs flex-1">
                      Cancel Edit
                    </Button>
                  )}
                  <Button variant="primary" onClick={handleSave} className="text-xs font-bold flex-1 bg-slate-900 hover:bg-slate-800 text-white">
                    {currentEditingRole ? "Save Changes" : "Create Role"}
                  </Button>
                </div>
              </div>
            )}
          </div>

          {/* ── AVAILABLE ROLES TABLE ── */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                Available Roles ({roles.length})
              </h4>
              <button
                type="button"
                onClick={() => setDeptDrawerOpen(true)}
                className="text-[11px] font-bold text-slate-800 hover:text-slate-900 flex items-center gap-1"
              >
                <Building2 className="w-3 h-3 text-slate-700" />
                Manage Departments
              </button>
            </div>

            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search roles..."
                className="w-full pl-9 pr-3 py-2 text-xs border border-slate-200 rounded-xl bg-white focus:outline-none focus:border-slate-400 transition-colors"
              />
            </div>

            {/* Roles Table */}
            <div className="border border-slate-200 rounded-2xl overflow-hidden bg-white shadow-2xs">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-900 text-white">
                    <th className="px-3.5 py-3 text-[11px] font-bold uppercase tracking-wider text-slate-300">
                      Role
                    </th>
                    <th className="px-3.5 py-3 text-[11px] font-bold uppercase tracking-wider text-slate-300">
                      Department
                    </th>
                    <th className="px-3.5 py-3 text-[11px] font-bold uppercase tracking-wider text-slate-300">
                      Team Members
                    </th>
                    <th className="px-3.5 py-3 text-[11px] font-bold uppercase tracking-wider text-slate-300 text-right">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRoles.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="px-4 py-8 text-center text-xs text-slate-400">
                        No roles found matching search.
                      </td>
                    </tr>
                  ) : (
                    filteredRoles.map((role) => (
                      <tr key={role.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50/80 transition-colors">
                        <td className="px-3.5 py-2.5">
                          <div className="flex items-center gap-2">
                            <div className="w-7 h-7 rounded-lg bg-slate-100 border border-slate-200 flex items-center justify-center shrink-0">
                              <Shield className="w-3.5 h-3.5 text-slate-700" />
                            </div>
                            <div className="min-w-0">
                              <div className="text-xs font-bold text-slate-900 truncate">{role.name}</div>
                              {role.isDefault && (
                                <div className="text-[10px] text-slate-500 font-semibold">System Default</div>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="px-3.5 py-2.5">
                          {role.department ? (
                            <button
                              type="button"
                              onClick={() => setDeptDrawerOpen(true)}
                              title="Manage departments"
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-slate-100 text-slate-800 border border-slate-200 hover:bg-slate-200 transition-colors cursor-pointer"
                            >
                              <Building2 className="w-3 h-3 text-slate-600" />
                              {role.department}
                            </button>
                          ) : (
                            <span className="text-xs text-slate-400 italic">—</span>
                          )}
                        </td>
                        <td className="px-3.5 py-2.5">
                          {(() => {
                            const count = assignedUserCounts[role.id] ?? assignedUserCounts[role.name] ?? 0;
                            return (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
                                <Users className="w-2.5 h-2.5 text-slate-500" />
                                {count} member{count !== 1 ? "s" : ""}
                              </span>
                            );
                          })()}
                        </td>
                        <td className="px-3.5 py-2.5 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              type="button"
                              onClick={() => handleStartEdit(role)}
                              title="Edit role"
                              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-900 hover:bg-slate-100 transition-colors"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            {!role.isDefault && (
                              <button
                                type="button"
                                onClick={() => handleDelete(role.id, role.name)}
                                title="Delete role"
                                className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

        </div>
      </Drawer>

      {/* ── SEPARATE DEPARTMENT DRAWER (40% width, stacked on top) ── */}
      <DepartmentDrawer
        isOpen={deptDrawerOpen}
        onClose={() => { setDeptDrawerOpen(false); setDepartments(getStoredDepartments()); }}
        roles={roles}
        onDepartmentsChange={(deps) => setDepartments(deps)}
        zIndex={zIndex + 100}
      />
    </>
  );
}
