import React, { useState, useEffect } from "react";
import { Drawer } from "../ui/drawer";
import { Building2, Plus, Trash2, Pencil, Check, X, Shield } from "lucide-react";
import { toast } from "sonner";
import type { Department, Role } from "../../../types/permissions";
import {
  getStoredDepartments,
  saveStoredDepartments,
  DEPARTMENTS_KEY,
} from "../../../lib/departmentStore";

export { getStoredDepartments, saveStoredDepartments, DEPARTMENTS_KEY };

export interface GenericRoleLike {
  id?: string;
  name?: string;
  roleName?: string;
  department?: string;
}

// ── Props ─────────────────────────────────────────────────────────────────────
export interface DepartmentDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  roles?: GenericRoleLike[];
  onDepartmentsChange?: (deps: Department[]) => void;
  initialEditDepartment?: Department | null;
  zIndex?: number;
}

// ── Component ─────────────────────────────────────────────────────────────────
export function DepartmentDrawer({
  isOpen,
  onClose,
  roles = [],
  onDepartmentsChange,
  initialEditDepartment = null,
  zIndex = 10100,
}: DepartmentDrawerProps) {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [newName, setNewName] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editDesc, setEditDesc] = useState("");

  useEffect(() => {
    if (isOpen) {
      const stored = getStoredDepartments();
      setDepartments(stored);
      setNewName("");
      setNewDesc("");
      if (initialEditDepartment) {
        setEditingId(initialEditDepartment.id);
        setEditName(initialEditDepartment.name);
        setEditDesc(initialEditDepartment.description || "");
      } else {
        setEditingId(null);
        setEditName("");
        setEditDesc("");
      }
    }
  }, [isOpen, initialEditDepartment]);

  const persist = (updated: Department[]) => {
    setDepartments(updated);
    saveStoredDepartments(updated);
    onDepartmentsChange?.(updated);
  };

  const handleCreate = () => {
    const trimmed = newName.trim();
    if (!trimmed) {
      toast.error("Department name is required.");
      return;
    }
    if (departments.some((d) => d.name.toLowerCase() === trimmed.toLowerCase())) {
      toast.error("A department with this name already exists.");
      return;
    }
    const newDept: Department = {
      id: "dept_" + Date.now(),
      name: trimmed,
      description: newDesc.trim(),
    };
    persist([...departments, newDept]);
    setNewName("");
    setNewDesc("");
    toast.success(`Department "${trimmed}" created successfully.`);
  };

  const handleDelete = (id: string) => {
    const dept = departments.find((d) => d.id === id);
    persist(departments.filter((d) => d.id !== id));
    toast.success(`Department "${dept?.name || ""}" removed.`);
  };

  const handleStartEdit = (dept: Department) => {
    setEditingId(dept.id);
    setEditName(dept.name);
    setEditDesc(dept.description || "");
  };

  const handleSaveEdit = () => {
    const trimmed = editName.trim();
    if (!trimmed) {
      toast.error("Department name cannot be empty.");
      return;
    }
    if (
      departments.some(
        (d) => d.name.toLowerCase() === trimmed.toLowerCase() && d.id !== editingId
      )
    ) {
      toast.error("A department with this name already exists.");
      return;
    }
    persist(
      departments.map((d) =>
        d.id === editingId ? { ...d, name: trimmed, description: editDesc.trim() } : d
      )
    );
    setEditingId(null);
    setEditName("");
    setEditDesc("");
    toast.success("Department updated.");
  };

  return (
    <Drawer
      isOpen={isOpen}
      onClose={onClose}
      title={
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center">
            <Building2 className="w-4 h-4 text-slate-800" />
          </div>
          <div>
            <div className="text-base font-bold text-slate-900" style={{ fontFamily: "Outfit, sans-serif" }}>
              Departments
            </div>
            <div className="text-[11px] text-slate-400 font-normal" style={{ fontFamily: "Outfit, sans-serif" }}>
              {departments.length} department{departments.length !== 1 ? "s" : ""} total
            </div>
          </div>
        </div>
      }
      maxWidth="max-w-[40vw] w-[40vw]"
      zIndex={zIndex}
    >
      <div className="space-y-5" style={{ fontFamily: "Outfit, sans-serif" }}>
        {/* Create new department - Name and Description ONLY */}
        <div className="bg-slate-50 border border-slate-200/90 rounded-2xl p-4 space-y-3 shadow-2xs">
          <p className="text-[11px] font-bold text-slate-800 uppercase tracking-wider">Add Department</p>
          <div className="space-y-2.5">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Department Name <span className="text-red-500">*</span>
              </label>
              <input
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="e.g. Clinical Operations, Marketing, Finance..."
                className="w-full px-3.5 py-2 text-xs border border-slate-200 rounded-xl bg-white focus:outline-none focus:border-slate-400 transition-colors shadow-2xs"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Description <span className="text-slate-400 font-normal">(optional)</span>
              </label>
              <input
                value={newDesc}
                onChange={(e) => setNewDesc(e.target.value)}
                placeholder="Brief description of department scope and responsibilities..."
                className="w-full px-3.5 py-2 text-xs border border-slate-200 rounded-xl bg-white focus:outline-none focus:border-slate-400 transition-colors shadow-2xs"
              />
            </div>
            <button
              type="button"
              onClick={handleCreate}
              disabled={!newName.trim()}
              className="w-full flex items-center justify-center gap-1.5 px-3.5 py-2.5 text-xs font-bold bg-slate-900 text-white rounded-xl hover:bg-slate-800 transition-colors disabled:opacity-40 cursor-pointer shadow-2xs"
            >
              <Plus className="w-3.5 h-3.5 text-white" />
              Add Department
            </button>
          </div>
        </div>

        {/* Departments list */}
        <div className="space-y-2">
          <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider px-0.5">
            All Departments ({departments.length})
          </p>
          {departments.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-200">
              <Building2 className="w-8 h-8 text-slate-300 mb-2" />
              <p className="text-xs text-slate-400 font-medium">No departments yet</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100 border border-slate-200 rounded-2xl overflow-hidden bg-white shadow-2xs">
              {departments.map((dept) => {
                const assignedRoles = roles.filter(
                  (r) => (r.department || "").toLowerCase() === dept.name.toLowerCase()
                );
                const roleCount = assignedRoles.length;

                return (
                  <div key={dept.id} className="flex flex-col px-4 py-3 group hover:bg-slate-50/80 transition-colors">
                    {editingId === dept.id ? (
                      <div className="space-y-2">
                        <div>
                          <label className="block text-[11px] font-semibold text-slate-700 mb-1">Name</label>
                          <input
                            autoFocus
                            value={editName}
                            onChange={(e) => setEditName(e.target.value)}
                            placeholder="Name..."
                            className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-xl focus:outline-none focus:border-slate-500 bg-white"
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] font-semibold text-slate-700 mb-1">Description</label>
                          <input
                            value={editDesc}
                            onChange={(e) => setEditDesc(e.target.value)}
                            placeholder="Description..."
                            className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-xl focus:outline-none focus:border-slate-500 bg-white"
                          />
                        </div>
                        <div className="flex items-center gap-2 pt-1">
                          <button
                            type="button"
                            onClick={handleSaveEdit}
                            className="px-3.5 py-1.5 text-xs font-bold rounded-xl bg-slate-900 text-white hover:bg-slate-800 cursor-pointer"
                          >
                            Save
                          </button>
                          <button
                            type="button"
                            onClick={() => setEditingId(null)}
                            className="px-3.5 py-1.5 text-xs text-slate-500 hover:text-slate-800 cursor-pointer"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-start gap-3 min-w-0">
                          <div className="w-7 h-7 rounded-lg bg-slate-100 border border-slate-200 flex items-center justify-center flex-shrink-0 mt-0.5">
                            <Building2 className="w-3.5 h-3.5 text-slate-700" />
                          </div>
                          <div className="min-w-0 space-y-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-xs font-bold text-slate-900 block truncate">{dept.name}</span>
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-100 text-slate-800 border border-slate-200">
                                <Shield className="w-2.5 h-2.5 text-slate-600" />
                                {roleCount} role{roleCount !== 1 ? "s" : ""}
                              </span>
                            </div>
                            {dept.description ? (
                              <span className="text-[11px] text-slate-500 block leading-snug">{dept.description}</span>
                            ) : (
                              <span className="text-[11px] text-slate-300 italic block">No description</span>
                            )}
                            {assignedRoles.length > 0 && (
                              <div className="flex items-center gap-1 flex-wrap pt-0.5">
                                <span className="text-[10px] text-slate-400 font-medium">Roles:</span>
                                {assignedRoles.map((r, idx) => (
                                  <span
                                    key={r.id || idx}
                                    className="text-[10px] font-semibold text-slate-700 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200"
                                  >
                                    {r.name || r.roleName}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            type="button"
                            onClick={() => handleStartEdit(dept)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-900 hover:bg-slate-100 cursor-pointer"
                            title="Edit Department"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDelete(dept.id)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 cursor-pointer"
                            title="Delete Department"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </Drawer>
  );
}
