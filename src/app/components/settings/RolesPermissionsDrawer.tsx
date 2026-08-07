import React, { useState, useEffect } from "react";
import { Drawer } from "../ui/drawer";
import { Button } from "../ui/Button";
import { Input } from "../ui/Input";
import { Shield, Plus, Edit2, Trash2, ArrowLeft, AlertCircle, Search, X } from "lucide-react";
import { toast } from "sonner";

export type PermissionLevel = "none" | "view" | "write" | "all";

export interface ItemPermissions {
  dashboard: PermissionLevel;
  clients: PermissionLevel;
  calls: PermissionLevel;
  processes: PermissionLevel;
  numbers: PermissionLevel;
  billing: PermissionLevel;
  webhooks: PermissionLevel;
  settings: PermissionLevel;
}

export interface Role {
  id: string;
  name: string;
  description?: string;
  isDefault?: boolean;
  permissions: ItemPermissions;
}

export const DEFAULT_ROLES: Role[] = [
  {
    id: "admin",
    name: "Admin",
    description: "Full read and write access to all modules and system settings",
    isDefault: true,
    permissions: {
      dashboard: "write",
      clients: "write",
      calls: "write",
      processes: "write",
      numbers: "write",
      billing: "write",
      webhooks: "write",
      settings: "write",
    },
  },
  {
    id: "manager",
    name: "Manager",
    description: "Full write access to operational modules and view access to system settings",
    isDefault: true,
    permissions: {
      dashboard: "write",
      clients: "write",
      calls: "write",
      processes: "write",
      numbers: "write",
      billing: "view",
      webhooks: "view",
      settings: "view",
    },
  },
  {
    id: "supervisor",
    name: "Supervisor",
    description: "Write access to core communications and processes with limited system access",
    isDefault: true,
    permissions: {
      dashboard: "write",
      clients: "write",
      calls: "write",
      processes: "write",
      numbers: "view",
      billing: "none",
      webhooks: "none",
      settings: "view",
    },
  },
  {
    id: "agent",
    name: "Agent",
    description: "View access to core dashboard and clients with write access to calls",
    isDefault: true,
    permissions: {
      dashboard: "view",
      clients: "view",
      calls: "write",
      processes: "view",
      numbers: "none",
      billing: "none",
      webhooks: "none",
      settings: "none",
    },
  },
];

interface RolesPermissionsDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  roles: Role[];
  onSaveRoles: (updatedRoles: Role[]) => void;
  assignedUserCounts?: Record<string, number>;
  zIndex?: number;
}

interface ModuleMeta {
  key: keyof ItemPermissions;
  label: string;
  description: string;
  category: "core" | "operations" | "system";
}

const MODULES_META: ModuleMeta[] = [
  { key: "dashboard", label: "Dashboard", description: "Analytics, summary widgets and performance metrics", category: "core" },
  { key: "clients", label: "Clients", description: "Client directory, profiles, custom fields and timeline", category: "core" },
  { key: "calls", label: "Calls", description: "Call logs, recordings, AI transcripts and dialer", category: "core" },
  { key: "processes", label: "Processes", description: "Workflow automation, pipelines, and stage management", category: "operations" },
  { key: "numbers", label: "Numbers", description: "Phone number purchasing, routing and IVR rules", category: "operations" },
  { key: "billing", label: "Billing", description: "Subscription plans, credit usage, invoices and payment methods", category: "system" },
  { key: "webhooks", label: "Webhooks", description: "API keys, webhook endpoints and developer integrations", category: "system" },
  { key: "settings", label: "Settings", description: "Organization profile, team members, roles and general settings", category: "system" },
];

export function RolesPermissionsDrawer({
  isOpen,
  onClose,
  roles,
  onSaveRoles,
  assignedUserCounts = {},
  zIndex = 9999,
}: RolesPermissionsDrawerProps) {
  const [viewMode, setViewMode] = useState<"list" | "edit">("list");
  const [editingRoleId, setEditingRoleId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  const [activePopoverCell, setActivePopoverCell] = useState<{
    roleId: string;
    roleName: string;
    moduleKey: keyof ItemPermissions;
    moduleLabel: string;
    currentLevel: PermissionLevel;
  } | null>(null);

  const [roleFormData, setRoleFormData] = useState<{
    name: string;
    description: string;
    permissions: ItemPermissions;
  }>({
    name: "",
    description: "",
    permissions: {
      dashboard: "view",
      clients: "view",
      calls: "view",
      processes: "view",
      numbers: "none",
      billing: "none",
      webhooks: "none",
      settings: "none",
    },
  });

  const [formErrors, setFormErrors] = useState<{ name?: string }>({});

  // Reset drawer state when opened
  useEffect(() => {
    if (isOpen) {
      setViewMode("list");
      setEditingRoleId(null);
      setSearchQuery("");
      setActivePopoverCell(null);
      setFormErrors({});
    }
  }, [isOpen]);

  const filteredRoles = roles.filter((r) => r.name.toLowerCase().includes(searchQuery.toLowerCase()));

  const handleStartCreateRole = () => {
    setEditingRoleId(null);
    setRoleFormData({
      name: "",
      description: "",
      permissions: {
        dashboard: "view",
        clients: "view",
        calls: "view",
        processes: "view",
        numbers: "none",
        billing: "none",
        webhooks: "none",
        settings: "none",
      },
    });
    setFormErrors({});
    setViewMode("edit");
  };

  const handleStartEditRole = (role: Role) => {
    setEditingRoleId(role.id);
    setRoleFormData({
      name: role.name,
      description: role.description || "",
      permissions: { ...role.permissions },
    });
    setFormErrors({});
    setViewMode("edit");
  };

  const handleDeleteRole = (role: Role) => {
    if (role.isDefault) {
      toast.error(`System default role "${role.name}" cannot be deleted.`);
      return;
    }
    const count = assignedUserCounts[role.name] || 0;
    if (count > 0) {
      toast.error(`Cannot delete role "${role.name}" — ${count} user(s) are assigned to it.`);
      return;
    }

    const updated = roles.filter((r) => r.id !== role.id);
    onSaveRoles(updated);
    toast.success(`Role "${role.name}" deleted successfully.`);
  };

  const handleUpdateCellPermission = (roleId: string, moduleKey: keyof ItemPermissions, level: PermissionLevel) => {
    const updatedRoles = roles.map((r) => {
      if (r.id === roleId) {
        return {
          ...r,
          permissions: {
            ...r.permissions,
            [moduleKey]: level,
          },
        };
      }
      return r;
    });

    onSaveRoles(updatedRoles);
    setActivePopoverCell(null);
    const matchedRole = roles.find((r) => r.id === roleId);
    const matchedMod = MODULES_META.find((m) => m.key === moduleKey);
    const displayLevel = level === "none" ? "No Access" : level === "view" ? "Read" : "Write";
    toast.success(`Updated ${matchedMod?.label || ""} for ${matchedRole?.name || ""} to ${displayLevel}.`);
  };

  const handleSaveRoleForm = () => {
    const trimmedName = roleFormData.name.trim();
    if (!trimmedName) {
      setFormErrors({ name: "Role name is required." });
      toast.error("Please enter a role name.");
      return;
    }

    // Check duplicate name
    const duplicate = roles.find(
      (r) => r.name.toLowerCase() === trimmedName.toLowerCase() && r.id !== editingRoleId
    );
    if (duplicate) {
      setFormErrors({ name: "A role with this name already exists." });
      toast.error("A role with this name already exists.");
      return;
    }

    let updatedRoles: Role[];
    if (editingRoleId) {
      updatedRoles = roles.map((r) =>
        r.id === editingRoleId
          ? {
              ...r,
              name: trimmedName,
              description: roleFormData.description.trim(),
              permissions: { ...roleFormData.permissions },
            }
          : r
      );
      toast.success(`Role "${trimmedName}" updated successfully.`);
    } else {
      const newRole: Role = {
        id: "custom_" + Date.now(),
        name: trimmedName,
        description: roleFormData.description.trim(),
        isDefault: false,
        permissions: { ...roleFormData.permissions },
      };
      updatedRoles = [...roles, newRole];
      toast.success(`Role "${trimmedName}" created successfully.`);
    }

    onSaveRoles(updatedRoles);
    setViewMode("list");
  };

  const setCategoryBulkPermission = (category: "core" | "operations" | "system", level: PermissionLevel) => {
    const nextPermissions = { ...roleFormData.permissions };
    MODULES_META.filter((m) => m.category === category).forEach((m) => {
      nextPermissions[m.key] = level;
    });
    setRoleFormData((prev) => ({ ...prev, permissions: nextPermissions }));
  };

  return (
    <Drawer
      isOpen={isOpen}
      onClose={onClose}
      zIndex={zIndex}
      maxWidth="sm:max-w-[60vw] w-[60vw]"
      title={
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600">
            <Shield className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-gray-900" style={{ fontFamily: "DM Sans, sans-serif" }}>
              Roles & Permissions
            </h3>
            <p className="text-xs text-gray-500" style={{ fontFamily: "Outfit, sans-serif" }}>
              Manage access levels and module permissions across team members
            </p>
          </div>
        </div>
      }
    >
      <div className="p-6 space-y-6 pb-20 relative">
        {/* VIEW 1: MATRIX TABLE (DEFAULT) */}
        {viewMode === "list" && (
          <div className="space-y-4">
            {/* Top Toolbar: Search & Create Role */}
            <div className="flex items-center justify-between gap-4 bg-white p-3 border border-gray-200 rounded-xl shadow-xs">
              <div className="relative flex-1 max-w-sm">
                <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search roles by name..."
                  className="w-full pl-9 pr-8 py-1.5 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50/50"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery("")}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-0.5"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              <Button
                variant="primary"
                onClick={handleStartCreateRole}
                className="flex items-center gap-1.5 text-xs font-bold px-3.5 py-2 flex-shrink-0"
              >
                <Plus className="w-4 h-4" />
                Create Role
              </Button>
            </div>

            {/* Matrix Table */}
            <div className="border border-gray-200 rounded-xl overflow-x-auto bg-white shadow-xs max-h-[calc(100vh-250px)] overflow-y-auto">
              <table className="w-full text-left border-collapse min-w-max">
                <thead>
                  <tr className="bg-[#1F2937] text-white border-b border-gray-700 sticky top-0 z-30">
                    <th className="sticky left-0 bg-[#1F2937] text-white z-40 w-64 p-3.5 border-r border-gray-700 text-xs font-bold uppercase tracking-wider">
                      MODULE
                    </th>
                    {filteredRoles.map((role) => {
                      const assignedCount = assignedUserCounts[role.name] || 0;
                      return (
                        <th key={role.id} className="p-3.5 border-r border-gray-700 min-w-[140px] max-w-[180px] text-center bg-[#1F2937] text-white">
                          <div className="font-bold text-sm text-white truncate">{role.name}</div>
                          <div className="text-[11px] text-gray-300 font-medium mt-0.5">
                            {assignedCount} {assignedCount === 1 ? "user" : "users"}
                          </div>
                        </th>
                      );
                    })}
                  </tr>
                </thead>
                <tbody>
                  {filteredRoles.length === 0 ? (
                    <tr>
                      <td colSpan={10} className="p-8 text-center text-xs text-gray-400">
                        No roles match "{searchQuery}"
                      </td>
                    </tr>
                  ) : (
                    MODULES_META.map((mod) => (
                      <tr key={mod.key} className="hover:bg-blue-50/20 transition-colors border-b border-gray-100 group">
                        <td className="sticky left-0 bg-white group-hover:bg-blue-50/20 z-20 p-3.5 border-r border-gray-200 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.05)]">
                          <div className="font-bold text-xs text-gray-900">{mod.label}</div>
                          <div className="text-[10px] text-gray-500 line-clamp-1" style={{ fontFamily: "Outfit, sans-serif" }}>
                            {mod.description}
                          </div>
                        </td>

                        {filteredRoles.map((role) => {
                          const level = role.permissions[mod.key] || "none";

                          return (
                            <td key={role.id} className="p-3 text-center border-r border-gray-100">
                              <button
                                type="button"
                                onClick={() =>
                                  setActivePopoverCell({
                                    roleId: role.id,
                                    roleName: role.name,
                                    moduleKey: mod.key,
                                    moduleLabel: mod.label,
                                    currentLevel: level,
                                  })
                                }
                                className="w-full flex items-center justify-center cursor-pointer py-1 text-center"
                              >
                                {level === "all" && (
                                  <span className="text-xs font-bold text-[#1E40AF]">All</span>
                                )}
                                {level === "write" && (
                                  <span className="text-xs font-bold text-[#2563EB]">Write</span>
                                )}
                                {level === "view" && (
                                  <span className="text-xs font-semibold text-[#4B5563]">Read</span>
                                )}
                                {level === "none" && (
                                  <span className="text-xs font-medium text-gray-300 hover:text-gray-500 transition-colors">
                                    —
                                  </span>
                                )}
                              </button>
                            </td>
                          );
                        })}
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Cell Edit Popover Modal */}
            {activePopoverCell && (
              <div
                className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/20 backdrop-blur-[1px]"
                onClick={() => setActivePopoverCell(null)}
              >
                <div
                  className="bg-white rounded-xl shadow-2xl border border-gray-200 p-5 w-80 space-y-4 animate-in fade-in zoom-in-95 duration-150"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="flex items-center justify-between pb-3 border-b border-gray-100">
                    <div>
                      <h4 className="text-sm font-bold text-gray-900">{activePopoverCell.moduleLabel}</h4>
                      <p className="text-xs text-blue-600 font-semibold">{activePopoverCell.roleName} Role</p>
                    </div>
                    <button
                      onClick={() => setActivePopoverCell(null)}
                      className="text-gray-400 hover:text-gray-600 p-1 rounded-lg hover:bg-gray-100 transition-colors"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider block">
                      Select Access Level
                    </label>

                    <div className="space-y-2">
                      {[
                        { key: "view" as PermissionLevel, label: "Read", desc: "Users can read and view module data" },
                        { key: "write" as PermissionLevel, label: "Write", desc: "Users can create and edit module data" },
                        { key: "all" as PermissionLevel, label: "All", desc: "Full access — able to read, write, as well as delete module data" },
                      ].map((opt) => {
                        const isSelected = activePopoverCell.currentLevel === opt.key;

                        return (
                          <button
                            key={opt.key}
                            type="button"
                            onClick={() =>
                              handleUpdateCellPermission(
                                activePopoverCell.roleId,
                                activePopoverCell.moduleKey,
                                opt.key
                              )
                            }
                            className={`w-full text-left p-3 rounded-lg border transition-all flex items-start gap-3 cursor-pointer ${
                              isSelected
                                ? "border-blue-500 bg-blue-50/70 shadow-xs"
                                : "border-gray-200 hover:border-gray-300 hover:bg-gray-50"
                            }`}
                          >
                            <div
                              className={`mt-0.5 w-4 h-4 rounded-full border flex items-center justify-center flex-shrink-0 ${
                                isSelected ? "border-blue-600 bg-blue-600 text-white" : "border-gray-300 bg-white"
                              }`}
                            >
                              {isSelected && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between">
                                <span className={`text-xs font-bold ${isSelected ? "text-blue-900" : "text-gray-900"}`}>
                                  {opt.label}
                                </span>
                              </div>
                              <p className="text-[11px] text-gray-500 mt-0.5 leading-snug">{opt.desc}</p>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* VIEW 2: CREATE / EDIT ROLE */}
        {viewMode === "edit" && (
          <div className="space-y-6">
            <button
              onClick={() => setViewMode("list")}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-gray-500 hover:text-gray-900 transition-colors cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" /> Back to Roles list
            </button>

            <div className="space-y-4 bg-gray-50/50 p-4 rounded-xl border border-gray-200">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Role Name <span className="text-red-500">*</span>
                </label>
                <Input
                  value={roleFormData.name}
                  onChange={(e) => {
                    setRoleFormData({ ...roleFormData, name: e.target.value });
                    if (formErrors.name) setFormErrors({});
                  }}
                  placeholder="e.g. Sales Manager, Support Specialist"
                  className="w-full text-sm bg-white"
                />
                {formErrors.name && (
                  <p className="text-xs text-red-500 mt-1 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" /> {formErrors.name}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Description <span className="text-gray-400 font-normal">(optional)</span>
                </label>
                <textarea
                  value={roleFormData.description}
                  onChange={(e) => setRoleFormData({ ...roleFormData, description: e.target.value })}
                  placeholder="Briefly describe what this role is responsible for..."
                  rows={2}
                  className="w-full px-3 py-2 text-xs border border-gray-200 rounded-lg focus:outline-none focus:border-blue-500 bg-white"
                  style={{ fontFamily: "Outfit, sans-serif" }}
                />
              </div>
            </div>

            {/* PERMISSIONS RADIO FORM */}
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b border-gray-200 pb-2">
                <h4 className="text-sm font-bold text-gray-900">Module Access Control</h4>
                <span className="text-xs text-gray-500">Select Read / Write / All (unselected = No Access)</span>
              </div>

              <div className="border border-gray-200 rounded-xl overflow-hidden bg-white divide-y divide-gray-100">
                {MODULES_META.map((mod) => {
                  const currentPerm = roleFormData.permissions[mod.key] || "none";

                  return (
                    <div key={mod.key} className="p-3.5 flex items-center justify-between gap-4 hover:bg-gray-50/50 transition-colors">
                      <div className="min-w-0 flex-1">
                        <h5 className="text-xs font-bold text-gray-900">{mod.label}</h5>
                        <p className="text-[11px] text-gray-500 mt-0.5" style={{ fontFamily: "Outfit, sans-serif" }}>
                          {mod.description}
                        </p>
                      </div>

                      {/* 3 Radio Values: Read / Write / All */}
                      <div className="flex items-center gap-4 flex-shrink-0">
                        <label className="flex items-center gap-1.5 cursor-pointer text-xs text-gray-700 hover:text-gray-900">
                          <input
                            type="radio"
                            name={`perm-${mod.key}`}
                            checked={currentPerm === "view"}
                            onChange={() =>
                              setRoleFormData({
                                ...roleFormData,
                                permissions: { ...roleFormData.permissions, [mod.key]: "view" },
                              })
                            }
                            className="w-3.5 h-3.5 text-blue-600 focus:ring-blue-500"
                          />
                          <span className="font-medium">Read</span>
                        </label>

                        <label className="flex items-center gap-1.5 cursor-pointer text-xs text-gray-700 hover:text-gray-900">
                          <input
                            type="radio"
                            name={`perm-${mod.key}`}
                            checked={currentPerm === "write"}
                            onChange={() =>
                              setRoleFormData({
                                ...roleFormData,
                                permissions: { ...roleFormData.permissions, [mod.key]: "write" },
                              })
                            }
                            className="w-3.5 h-3.5 text-blue-600 focus:ring-blue-500"
                          />
                          <span className="font-medium">Write</span>
                        </label>

                        <label className="flex items-center gap-1.5 cursor-pointer text-xs text-gray-700 hover:text-gray-900">
                          <input
                            type="radio"
                            name={`perm-${mod.key}`}
                            checked={currentPerm === "all"}
                            onChange={() =>
                              setRoleFormData({
                                ...roleFormData,
                                permissions: { ...roleFormData.permissions, [mod.key]: "all" },
                              })
                            }
                            className="w-3.5 h-3.5 text-blue-600 focus:ring-blue-500"
                          />
                          <span className="font-medium">All</span>
                        </label>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* FORM FOOTER BUTTONS */}
            <div className="flex items-center justify-end gap-3 pt-6 border-t border-gray-200">
              <Button variant="outline" onClick={() => setViewMode("list")} className="text-xs">
                Cancel
              </Button>
              <Button variant="primary" onClick={handleSaveRoleForm} className="text-xs font-bold px-4 py-2">
                Save Role
              </Button>
            </div>
          </div>
        )}
      </div>
    </Drawer>
  );
}
