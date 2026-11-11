/**
 * AdminUserManagement.tsx
 * Path: src/app/pages/admin/AdminUserManagement.tsx
 *
 * Dedicated Admin Console for User Management & RBAC Roles (/admin/settings/users):
 * - URL synced tabs: Users | Roles (?tab=users / ?tab=roles)
 * - Users tab:
 *   - Table: Avatar + Name, Email, Role (renamed from "Security Role" per G5), Status, Last Login, Created
 *   - Actions: Invite Admin, Change Role, Suspend/Reactivate, Reset Password, Resend Invite, Remove
 *   - Search & filters (Role, Status)
 *   - Top bar: "Invite Admin" button (G1), Export icon (G2)
 * - Roles tab:
 *   - Roles list: SystemAdmin, Admin, BillingAdmin, SupportSpecialist, ReadonlyAuditor, custom roles
 *   - Protected system roles (not deletable; SystemAdmin not editable)
 *   - Create, edit, duplicate, delete custom roles
 *   - Role Editor Drawer: Permission matrix table across all 25 ADMIN_MODULES
 *     matching client architecture (PermissionSelect multi-select + Level dropdown)
 *   - Top bar: "Add Role" button (G1)
 * - All administrative operations write audit log entries
 */

import React, { useState, useEffect, useMemo, useCallback } from "react";
import { useSearchParams } from "react-router";
import PageHeader from "../../components/layout/PageHeader";
import PageTopBar from "../../components/layout/PageTopBar";
import TableComponent, { TableColumn, TableRowAction } from "../../components/ui/TableComponent";
import DrawerShell from "../../components/ui/DrawerShell";
import { Modal } from "../../components/ui/Modal";

import PermissionSelect, { PermissionAction } from "../../components/settings/PermissionSelect";
import {
  useAdminRoles,
  ADMIN_MODULES,
  AdminRoleItem,
  ScopeLevelOption,
  createAdminRole,
  updateAdminRole,
  duplicateAdminRole,
  deleteAdminRole,
} from "../../../lib/adminRolesStore";
import { recordAuditLog } from "../../../lib/auditLogsStore";
import { exportToCsv } from "../../../lib/productAnalyticsStore";
import {
  Users,
  Shield,
  KeyRound,
  Mail,
  Lock,
  Edit2,
  Trash2,
  Copy,
  ChevronDown,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  UserCheck,
  UserX,
  Layers,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";

export interface AdminUserItem {
  id: string;
  name: string;
  email: string;
  role: string; // e.g. "SystemAdmin", "Admin", etc.
  status: "Active" | "Suspended" | "Invited";
  lastLogin?: string;
  createdDate: string;
  avatarColor?: string;
}

export const ADMIN_USERS_STORAGE_KEY = "mantra_admin_users";
export const ADMIN_USERS_EVENT = "mantra-admin-users-updated";

const INITIAL_ADMIN_USERS: AdminUserItem[] = [
  {
    id: "usr-001",
    name: "Alexander Vance",
    email: "alexander.v@mantra.care",
    role: "SystemAdmin",
    status: "Active",
    lastLogin: new Date(Date.now() - 1000 * 60 * 18).toISOString(),
    createdDate: "2023-11-01T08:00:00.000Z",
    avatarColor: "bg-blue-600",
  },
  {
    id: "usr-002",
    name: "Elena Rostova",
    email: "elena.r@mantra.care",
    role: "Admin",
    status: "Active",
    lastLogin: new Date(Date.now() - 1000 * 60 * 60 * 4).toISOString(),
    createdDate: "2023-12-10T10:00:00.000Z",
    avatarColor: "bg-purple-600",
  },
  {
    id: "usr-003",
    name: "Marcus Holloway",
    email: "marcus.h@mantra.care",
    role: "BillingAdmin",
    status: "Active",
    lastLogin: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(),
    createdDate: "2024-01-15T12:00:00.000Z",
    avatarColor: "bg-emerald-600",
  },
  {
    id: "usr-004",
    name: "Claire Underwood",
    email: "claire.u@mantra.care",
    role: "SupportSpecialist",
    status: "Active",
    lastLogin: new Date(Date.now() - 1000 * 60 * 60 * 48).toISOString(),
    createdDate: "2024-02-01T09:00:00.000Z",
    avatarColor: "bg-amber-600",
  },
  {
    id: "usr-005",
    name: "Dr. David Chen",
    email: "david.c@mantra.care",
    role: "ReadonlyAuditor",
    status: "Suspended",
    lastLogin: "2024-03-01T14:20:00.000Z",
    createdDate: "2024-02-15T11:00:00.000Z",
    avatarColor: "bg-slate-600",
  },
  {
    id: "usr-006",
    name: "Sophia Martinez",
    email: "sophia.m@mantra.care",
    role: "Admin",
    status: "Invited",
    createdDate: "2024-04-18T10:00:00.000Z",
    avatarColor: "bg-indigo-600",
  },
];

function getStoredAdminUsers(): AdminUserItem[] {
  try {
    if (typeof window === "undefined") return INITIAL_ADMIN_USERS;
    const raw = localStorage.getItem(ADMIN_USERS_STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(ADMIN_USERS_STORAGE_KEY, JSON.stringify(INITIAL_ADMIN_USERS));
      return INITIAL_ADMIN_USERS;
    }
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : INITIAL_ADMIN_USERS;
  } catch {
    return INITIAL_ADMIN_USERS;
  }
}

function saveStoredAdminUsers(users: AdminUserItem[]): void {
  try {
    if (typeof window !== "undefined") {
      localStorage.setItem(ADMIN_USERS_STORAGE_KEY, JSON.stringify(users));
      window.dispatchEvent(new CustomEvent(ADMIN_USERS_EVENT));
    }
  } catch (err) {
    console.error("Failed to save admin users:", err);
  }
}

export default function AdminUserManagement() {
  const [searchParams, setSearchParams] = useSearchParams();
  const rawTab = searchParams.get("tab");
  const activeTab: "users" | "roles" = rawTab === "roles" ? "roles" : "users";

  const setTab = (t: "users" | "roles") => {
    setSearchParams({ tab: t });
  };

  // Roles Store Hook
  const { roles, refresh: refreshRoles } = useAdminRoles();

  // Users State
  const [users, setUsers] = useState<AdminUserItem[]>(getStoredAdminUsers);

  const refreshUsers = useCallback(() => {
    setUsers(getStoredAdminUsers());
  }, []);

  useEffect(() => {
    const handler = () => refreshUsers();
    window.addEventListener(ADMIN_USERS_EVENT, handler);
    return () => window.removeEventListener(ADMIN_USERS_EVENT, handler);
  }, [refreshUsers]);

  // ─────────────────────────────────────────────────────────────
  // USERS TAB STATE & ACTIONS
  // ─────────────────────────────────────────────────────────────
  const [userSearch, setUserSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");

  // Invite Drawer
  const [isInviteOpen, setIsInviteOpen] = useState(false);
  const [inviteName, setInviteName] = useState("");
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("Admin");

  // Change Role Modal
  const [userForRoleChange, setUserForRoleChange] = useState<AdminUserItem | null>(null);
  const [selectedNewRole, setSelectedNewRole] = useState("");

  // Reset Password Modal
  const [userForPasswordReset, setUserForPasswordReset] = useState<AdminUserItem | null>(null);

  // Filtered Users
  const filteredUsers = useMemo(() => {
    return users.filter((u) => {
      if (roleFilter !== "all" && u.role !== roleFilter) return false;
      if (statusFilter !== "all" && u.status !== statusFilter) return false;

      if (userSearch.trim()) {
        const q = userSearch.toLowerCase();
        const matchName = u.name.toLowerCase().includes(q);
        const matchEmail = u.email.toLowerCase().includes(q);
        const matchRole = u.role.toLowerCase().includes(q);
        if (!matchName && !matchEmail && !matchRole) return false;
      }

      return true;
    });
  }, [users, roleFilter, statusFilter, userSearch]);

  const handleSendInvite = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteName.trim() || !inviteEmail.trim()) {
      toast.error("Name and email are required");
      return;
    }

    const newUser: AdminUserItem = {
      id: `usr-${Date.now().toString(36)}`,
      name: inviteName.trim(),
      email: inviteEmail.trim().toLowerCase(),
      role: inviteRole,
      status: "Invited",
      createdDate: new Date().toISOString(),
      avatarColor: "bg-blue-600",
    };

    const updated = [newUser, ...users];
    saveStoredAdminUsers(updated);

    recordAuditLog({
      actorId: "usr-admin-1",
      actorName: "Alexander Vance",
      actorEmail: "alexander.v@mantra.care",
      actorRole: "SystemAdmin",
      action: "invite_sent",
      module: "Users",
      entityType: "AdminUser",
      entityId: newUser.id,
      targetName: newUser.name,
      summary: `Sent administrative invitation to ${newUser.email} with role "${newUser.role}"`,
      before: null,
      after: { name: newUser.name, email: newUser.email, role: newUser.role },
    });

    setIsInviteOpen(false);
    setInviteName("");
    setInviteEmail("");
    toast.success(`Invitation dispatched to ${newUser.email}`);
  };

  const handleConfirmRoleChange = () => {
    if (!userForRoleChange || !selectedNewRole) return;
    const prevRole = userForRoleChange.role;

    const updated = users.map((u) =>
      u.id === userForRoleChange.id ? { ...u, role: selectedNewRole } : u
    );
    saveStoredAdminUsers(updated);

    recordAuditLog({
      actorId: "usr-admin-1",
      actorName: "Alexander Vance",
      actorEmail: "alexander.v@mantra.care",
      actorRole: "SystemAdmin",
      action: "updated",
      module: "Users",
      entityType: "AdminUser",
      entityId: userForRoleChange.id,
      targetName: userForRoleChange.name,
      summary: `Changed administrative role for ${userForRoleChange.name} from "${prevRole}" to "${selectedNewRole}"`,
      before: { role: prevRole },
      after: { role: selectedNewRole },
    });

    setUserForRoleChange(null);
    toast.success(`Role updated for ${userForRoleChange.name}`);
  };

  const handleToggleSuspend = (u: AdminUserItem) => {
    const isSuspending = u.status === "Active";
    const nextStatus: "Active" | "Suspended" = isSuspending ? "Suspended" : "Active";

    const updated = users.map((item) =>
      item.id === u.id ? { ...item, status: nextStatus } : item
    );
    saveStoredAdminUsers(updated);

    recordAuditLog({
      actorId: "usr-admin-1",
      actorName: "Alexander Vance",
      actorEmail: "alexander.v@mantra.care",
      actorRole: "SystemAdmin",
      action: isSuspending ? "suspended" : "reactivated",
      module: "Users",
      entityType: "AdminUser",
      entityId: u.id,
      targetName: u.name,
      summary: `${isSuspending ? "Suspended" : "Reactivated"} admin account for ${u.name}`,
      before: { status: u.status },
      after: { status: nextStatus },
    });

    toast.success(
      isSuspending
        ? `Suspended administrative access for ${u.name}`
        : `Reactivated account for ${u.name}`
    );
  };

  const handleConfirmPasswordReset = () => {
    if (!userForPasswordReset) return;

    recordAuditLog({
      actorId: "usr-admin-1",
      actorName: "Alexander Vance",
      actorEmail: "alexander.v@mantra.care",
      actorRole: "SystemAdmin",
      action: "reset_password",
      module: "Users",
      entityType: "AdminUser",
      entityId: userForPasswordReset.id,
      targetName: userForPasswordReset.name,
      summary: `Dispatched secure password reset email to ${userForPasswordReset.email}`,
      before: null,
      after: { resetSent: true },
    });

    toast.success(`Password reset dispatch sent to ${userForPasswordReset.email}`);
    setUserForPasswordReset(null);
  };

  const handleResendInvite = (u: AdminUserItem) => {
    recordAuditLog({
      actorId: "usr-admin-1",
      actorName: "Alexander Vance",
      actorEmail: "alexander.v@mantra.care",
      actorRole: "SystemAdmin",
      action: "invite_sent",
      module: "Users",
      entityType: "AdminUser",
      entityId: u.id,
      targetName: u.name,
      summary: `Resent admin invitation email to ${u.email}`,
      before: null,
      after: { inviteResent: true },
    });
    toast.success(`Re-sent invitation email to ${u.email}`);
  };

  const handleRemoveUser = (u: AdminUserItem) => {
    if (confirm(`Remove administrator ${u.name} (${u.email})? This action cannot be undone.`)) {
      const updated = users.filter((item) => item.id !== u.id);
      saveStoredAdminUsers(updated);

      recordAuditLog({
        actorId: "usr-admin-1",
        actorName: "Alexander Vance",
        actorEmail: "alexander.v@mantra.care",
        actorRole: "SystemAdmin",
        action: "deleted",
        module: "Users",
        entityType: "AdminUser",
        entityId: u.id,
        targetName: u.name,
        summary: `Permanently removed admin user ${u.name} (${u.email})`,
        before: { name: u.name, email: u.email, role: u.role },
        after: null,
      });

      toast.success(`Removed admin user ${u.name}`);
    }
  };

  const handleExportUsersCsv = () => {
    const headers = ["User ID", "Name", "Email", "Role", "Status", "Last Login", "Created Date"];
    const rows = filteredUsers.map((u) => [
      u.id,
      `"${u.name.replace(/"/g, '""')}"`,
      `"${u.email}"`,
      `"${u.role}"`,
      u.status,
      u.lastLogin ? new Date(u.lastLogin).toLocaleDateString() : "Never",
      new Date(u.createdDate).toLocaleDateString(),
    ]);
    exportToCsv("mantra-admin-users", headers, rows);
    toast.success(`Exported ${filteredUsers.length} admin users to CSV`);
  };

  const handleExportRolesCsv = () => {
    const headers = ["Role ID", "Role Name", "Type", "Assigned Users", "Description"];
    const rows = filteredRoles.map((r) => [
      r.id,
      `"${r.name.replace(/"/g, '""')}"`,
      r.isSystem ? "System Role" : "Custom Role",
      users.filter((u) => u.role.toLowerCase() === r.name.toLowerCase()).length,
      `"${r.description.replace(/"/g, '""')}"`,
    ]);
    exportToCsv("mantra-admin-roles", headers, rows);
    toast.success(`Exported ${filteredRoles.length} admin roles to CSV`);
  };

  // Users Table Columns
  const userColumns: TableColumn<AdminUserItem>[] = [
    {
      key: "name",
      header: "ADMINISTRATOR",
      render: (u) => (
        <div className="flex items-center gap-2.5 min-w-0">
          <div
            className={`w-7 h-7 rounded-lg ${
              u.avatarColor || "bg-slate-800"
            } text-white flex items-center justify-center font-bold text-[11px] shadow-2xs shrink-0`}
          >
            {u.name.slice(0, 2).toUpperCase()}
          </div>
          <div className="min-w-0 truncate">
            <span className="font-semibold text-gray-900 text-xs truncate block">{u.name}</span>
          </div>
        </div>
      ),
    },
    {
      key: "email",
      header: "EMAIL",
      render: (u) => (
        <span className="text-xs text-gray-600 truncate block font-mono" title={u.email}>
          {u.email}
        </span>
      ),
    },
    {
      key: "role",
      header: "ROLE", // Renamed from "Security Role" per G5
      render: (u) => {
        let badgeStyle = "bg-slate-100 text-slate-700 border-slate-200/60";
        if (u.role === "SystemAdmin") badgeStyle = "bg-rose-50 text-rose-800 border-rose-200/60";
        if (u.role === "Admin") badgeStyle = "bg-blue-50 text-blue-800 border-blue-200/60";
        if (u.role === "BillingAdmin") badgeStyle = "bg-emerald-50 text-emerald-800 border-emerald-200/60";
        if (u.role === "SupportSpecialist") badgeStyle = "bg-amber-50 text-amber-800 border-amber-200/60";
        if (u.role === "ReadonlyAuditor") badgeStyle = "bg-purple-50 text-purple-800 border-purple-200/60";

        return (
          <span
            className={`inline-flex items-center text-[11px] font-semibold px-2 py-0.5 rounded-full border ${badgeStyle} whitespace-nowrap`}
          >
            {u.role}
          </span>
        );
      },
    },
    {
      key: "status",
      header: "STATUS",
      width: "110px",
      render: (u) => {
        let style = "bg-emerald-50 text-emerald-700 border-emerald-200/60";
        if (u.status === "Suspended") style = "bg-rose-50 text-rose-700 border-rose-200/60";
        if (u.status === "Invited") style = "bg-amber-50 text-amber-700 border-amber-200/60";

        return (
          <span
            className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold border ${style}`}
          >
            {u.status}
          </span>
        );
      },
    },
    {
      key: "lastLogin",
      header: "LAST LOGIN",
      render: (u) => (
        <span className="text-xs text-gray-500 font-mono tabular-nums whitespace-nowrap">
          {u.lastLogin
            ? new Date(u.lastLogin).toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
                year: "numeric",
              })
            : "Never"}
        </span>
      ),
    },
    {
      key: "createdDate",
      header: "CREATED",
      render: (u) => (
        <span className="text-xs text-gray-500 font-mono tabular-nums whitespace-nowrap">
          {new Date(u.createdDate).toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
            year: "numeric",
          })}
        </span>
      ),
    },
  ];

  const userRowActions: TableRowAction<AdminUserItem>[] = [
    {
      label: "Change Role",
      icon: <Shield className="w-3.5 h-3.5 text-blue-600" />,
      onClick: (u) => {
        setUserForRoleChange(u);
        setSelectedNewRole(u.role);
      },
    },
    {
      label: "Reset Password",
      icon: <KeyRound className="w-3.5 h-3.5 text-amber-600" />,
      onClick: (u) => setUserForPasswordReset(u),
    },
    {
      label: "Resend Invite",
      icon: <Mail className="w-3.5 h-3.5 text-indigo-600" />,
      hidden: (u) => u.status !== "Invited",
      onClick: (u) => handleResendInvite(u),
    },
    {
      label: "Suspend Access",
      icon: <UserX className="w-3.5 h-3.5 text-rose-600" />,
      hidden: (u) => u.status !== "Active" || u.role === "SystemAdmin",
      onClick: (u) => handleToggleSuspend(u),
    },
    {
      label: "Reactivate Access",
      icon: <UserCheck className="w-3.5 h-3.5 text-emerald-600" />,
      hidden: (u) => u.status !== "Suspended",
      onClick: (u) => handleToggleSuspend(u),
    },
    {
      label: "Remove Admin",
      icon: <Trash2 className="w-3.5 h-3.5 text-rose-600" />,
      hidden: (u) => u.role === "SystemAdmin",
      onClick: (u) => handleRemoveUser(u),
    },
  ];

  // ─────────────────────────────────────────────────────────────
  // ROLES TAB STATE & EDITOR DRAWER
  // ─────────────────────────────────────────────────────────────
  const [roleSearch, setRoleSearch] = useState("");
  const [editingRole, setEditingRole] = useState<AdminRoleItem | null>(null);
  const [isRoleEditorOpen, setIsRoleEditorOpen] = useState(false);

  // Role Form State
  const [formRoleName, setFormRoleName] = useState("");
  const [formRoleDesc, setFormRoleDesc] = useState("");
  const [formPermissions, setFormPermissions] = useState<
    Record<string, { actions: PermissionAction[]; level: ScopeLevelOption }>
  >({});

  const filteredRoles = useMemo(() => {
    if (!roleSearch.trim()) return roles;
    const q = roleSearch.toLowerCase();
    return roles.filter(
      (r) => r.name.toLowerCase().includes(q) || r.description.toLowerCase().includes(q)
    );
  }, [roles, roleSearch]);

  const handleOpenCreateRole = () => {
    setEditingRole(null);
    setFormRoleName("");
    setFormRoleDesc("");
    const initialPerms: Record<string, { actions: PermissionAction[]; level: ScopeLevelOption }> = {};
    ADMIN_MODULES.forEach((mod) => {
      initialPerms[mod.id] = { actions: ["read"], level: "all" };
    });
    setFormPermissions(initialPerms);
    setIsRoleEditorOpen(true);
  };

  const handleOpenEditRole = (r: AdminRoleItem) => {
    if (r.isLocked) {
      toast.error("SystemAdmin role is locked and cannot be edited.");
      return;
    }
    setEditingRole(r);
    setFormRoleName(r.name);
    setFormRoleDesc(r.description);
    setFormPermissions(r.permissions);
    setIsRoleEditorOpen(true);
  };

  const handleSaveRole = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formRoleName.trim()) {
      toast.error("Role Name is required");
      return;
    }

    if (editingRole) {
      updateAdminRole(editingRole.id, {
        name: formRoleName.trim(),
        description: formRoleDesc.trim(),
        permissions: formPermissions,
      });
      toast.success(`Updated role "${formRoleName}"`);
    } else {
      createAdminRole({
        name: formRoleName.trim(),
        description: formRoleDesc.trim(),
        permissions: formPermissions,
      });
      toast.success(`Created custom role "${formRoleName}"`);
    }

    refreshRoles();
    setIsRoleEditorOpen(false);
  };

  const handleDuplicateRole = (r: AdminRoleItem) => {
    duplicateAdminRole(r.id);
    refreshRoles();
    toast.success(`Duplicated role "${r.name}"`);
  };

  const handleDeleteRole = (r: AdminRoleItem) => {
    if (r.isSystem) {
      toast.error(`System role "${r.name}" is protected and cannot be deleted.`);
      return;
    }
    if (confirm(`Delete custom role "${r.name}"? Users assigned to this role must be reassigned.`)) {
      deleteAdminRole(r.id);
      refreshRoles();
      toast.success(`Deleted role "${r.name}"`);
    }
  };

  // Roles Table Columns
  const roleColumns: TableColumn<AdminRoleItem>[] = [
    {
      key: "name",
      header: "ROLE NAME",
      render: (r) => (
        <div className="flex items-center gap-2">
          {r.isLocked ? (
            <Lock className="w-3.5 h-3.5 text-slate-400" />
          ) : (
            <Shield className="w-3.5 h-3.5 text-slate-400" />
          )}
          <span className="font-semibold text-slate-900 text-xs">{r.name}</span>
          {r.isSystem && (
            <span className="px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider bg-slate-100 text-slate-600 border border-slate-200">
              System
            </span>
          )}
        </div>
      ),
    },
    {
      key: "description",
      header: "DESCRIPTION",
      render: (r) => (
        <span className="text-xs text-slate-600 truncate max-w-sm block" title={r.description}>
          {r.description}
        </span>
      ),
    },
    {
      key: "usersCount",
      header: "USERS",
      width: "90px",
      align: "center",
      render: (r) => {
        const count = users.filter((u) => u.role.toLowerCase() === r.name.toLowerCase()).length;
        return (
          <span className="font-mono text-xs font-semibold text-slate-700 bg-slate-50 px-2 py-0.5 rounded border border-slate-200">
            {count}
          </span>
        );
      },
    },
    {
      key: "createdDate",
      header: "CREATED",
      render: (r) => (
        <span className="text-xs text-slate-500 font-mono tabular-nums whitespace-nowrap">
          {new Date(r.createdDate).toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
            year: "numeric",
          })}
        </span>
      ),
    },
  ];

  const roleRowActions: TableRowAction<AdminRoleItem>[] = [
    {
      label: "Edit Role",
      icon: <Edit2 className="w-3.5 h-3.5 text-blue-600" />,
      disabled: (r) => !!r.isLocked,
      onClick: (r) => handleOpenEditRole(r),
    },
    {
      label: "Duplicate Role",
      icon: <Copy className="w-3.5 h-3.5 text-indigo-600" />,
      onClick: (r) => handleDuplicateRole(r),
    },
    {
      label: "Delete Role",
      icon: <Trash2 className="w-3.5 h-3.5 text-rose-600" />,
      disabled: (r) => r.isSystem,
      onClick: (r) => handleDeleteRole(r),
    },
  ];

  return (
    <div className="min-h-screen bg-[#fafafa]">
      {/* ── Top Bar Header ── */}
      <PageHeader
        title="User Management"
        subtitle="Manage administrator access privileges, team assignments, and granular RBAC role matrices"
      />

      <div className="px-10 sm:px-12 py-7.5 sm:py-8 w-full space-y-6 animate-in fade-in duration-200">
        {/* Unified PageTopBar with User/Role Tab Switcher Dropdown, Search, Filters, Export & Actions */}
        <PageTopBar
          searchQuery={activeTab === "users" ? userSearch : roleSearch}
          onSearchChange={activeTab === "users" ? setUserSearch : setRoleSearch}
          searchPlaceholder={
            activeTab === "users"
              ? "Search administrator by name, email, or role..."
              : "Search roles by name or description..."
          }
          onExport={activeTab === "users" ? handleExportUsersCsv : handleExportRolesCsv}
          primaryAction={
            activeTab === "users"
              ? {
                  label: "Invite User",
                  onClick: () => setIsInviteOpen(true),
                }
              : {
                  label: "Add Role",
                  onClick: handleOpenCreateRole,
                }
          }
          leftElement={
            <div className="flex items-center gap-2 flex-wrap mr-1">
              {/* Tab Switcher Dropdown */}
              <div className="relative shrink-0">
                <select
                  value={activeTab}
                  onChange={(e) => setTab(e.target.value as "users" | "roles")}
                  className="h-[34px] px-3 pr-7 bg-white hover:bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-slate-900 focus:outline-none cursor-pointer appearance-none shadow-2xs transition-colors"
                  style={{ fontFamily: "Outfit, sans-serif" }}
                >
                  <option value="users">Users</option>
                  <option value="roles">Roles</option>
                </select>
                <ChevronDown className="w-3.5 h-3.5 text-slate-500 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>

              {/* Users filters only on users tab */}
              {activeTab === "users" && (
                <>
                  {/* Role Filter */}
                  <div className="relative">
                    <select
                      value={roleFilter}
                      onChange={(e) => setRoleFilter(e.target.value)}
                      className="h-[34px] px-2.5 pr-7 bg-white hover:bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-700 focus:outline-none cursor-pointer appearance-none shadow-2xs max-w-[130px] transition-colors truncate"
                    >
                      <option value="all">All Roles</option>
                      {roles.map((r) => (
                        <option key={r.id} value={r.name}>
                          {r.name}
                        </option>
                      ))}
                    </select>
                    <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
                  </div>

                  {/* Status Filter */}
                  <div className="relative">
                    <select
                      value={statusFilter}
                      onChange={(e) => setStatusFilter(e.target.value)}
                      className="h-[34px] px-2.5 pr-7 bg-white hover:bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-700 focus:outline-none cursor-pointer appearance-none shadow-2xs max-w-[120px] transition-colors"
                    >
                      <option value="all">All Statuses</option>
                      <option value="Active">Active</option>
                      <option value="Invited">Invited</option>
                      <option value="Suspended">Suspended</option>
                    </select>
                    <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
                  </div>
                </>
              )}
            </div>
          }
        />

        {/* ─────────────────────────────────────────────────────────────
            TAB 1: USERS
        ───────────────────────────────────────────────────────────── */}
        {activeTab === "users" && (
          <div className="space-y-4">
            <div className="w-full">
              <TableComponent<AdminUserItem>
                data={filteredUsers}
                columns={userColumns}
                rowActions={userRowActions}
                getRowId={(u) => u.id}
                defaultRowsPerPage={20}
                pageSizeOptions={[20, 50, 100]}
                emptyMessage="No administrators found matching criteria."
              />
            </div>
          </div>
        )}

        {/* ─────────────────────────────────────────────────────────────
            TAB 2: ROLES
        ───────────────────────────────────────────────────────────── */}
        {activeTab === "roles" && (
          <div className="space-y-4">
            <div className="w-full">
              <TableComponent<AdminRoleItem>
                data={filteredRoles}
                columns={roleColumns}
                rowActions={roleRowActions}
                getRowId={(r) => r.id}
                defaultRowsPerPage={20}
                pageSizeOptions={[20, 50, 100]}
                emptyMessage="No roles found."
              />
            </div>
          </div>
        )}
      </div>

      {/* ─────────────────────────────────────────────────────────────
          INVITE ADMIN DRAWER
      ───────────────────────────────────────────────────────────── */}
      <DrawerShell
        isOpen={isInviteOpen}
        onClose={() => setIsInviteOpen(false)}
        title="Invite User"
        subtitle="Issue an invitation link with specified role permissions"
        width="w-full sm:w-[480px]"
      >
        <form onSubmit={handleSendInvite} className="space-y-4">
          <div>
            <label className="text-xs font-semibold text-slate-700 block mb-1">
              Full Name *
            </label>
            <input
              type="text"
              required
              value={inviteName}
              onChange={(e) => setInviteName(e.target.value)}
              placeholder="e.g. Rachel Adams"
              className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-700 block mb-1">
              Email Address *
            </label>
            <input
              type="email"
              required
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
              placeholder="rachel@mantra.care"
              className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-700 block mb-1">
              Assigned Role *
            </label>
            <select
              value={inviteRole}
              onChange={(e) => setInviteRole(e.target.value)}
              className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-800"
            >
              {roles.map((r) => (
                <option key={r.id} value={r.name}>
                  {r.name} — {r.description.slice(0, 45)}...
                </option>
              ))}
            </select>
            <p className="text-[11px] text-slate-400 mt-1">
              A user gets exactly one role; effective permissions are derived entirely from this role.
            </p>
          </div>

          <div className="pt-4 border-t border-slate-200 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setIsInviteOpen(false)}
              className="px-4 py-2 border border-slate-200 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-50 cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-slate-900 hover:bg-black text-white rounded-xl text-xs font-semibold cursor-pointer shadow-xs"
            >
              Send Invitation
            </button>
          </div>
        </form>
      </DrawerShell>

      {/* ─────────────────────────────────────────────────────────────
          CHANGE ROLE MODAL
      ───────────────────────────────────────────────────────────── */}
      <Modal
        isOpen={!!userForRoleChange}
        onClose={() => setUserForRoleChange(null)}
        title="Change Administrator Role"
        maxWidth="md"
      >
        <div className="space-y-4">
          <p className="text-xs text-slate-600">
            Reassign the administrative role for{" "}
            <span className="font-semibold text-slate-900">{userForRoleChange?.name}</span>.
          </p>

          <div>
            <label className="text-xs font-semibold text-slate-700 block mb-1">
              Select Role
            </label>
            <select
              value={selectedNewRole}
              onChange={(e) => setSelectedNewRole(e.target.value)}
              className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-800"
            >
              {roles.map((r) => (
                <option key={r.id} value={r.name}>
                  {r.name}
                </option>
              ))}
            </select>
          </div>

          <div className="pt-3 border-t border-slate-200 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setUserForRoleChange(null)}
              className="px-3.5 py-1.5 border border-slate-200 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-50 cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleConfirmRoleChange}
              className="px-3.5 py-1.5 bg-slate-900 hover:bg-black text-white rounded-xl text-xs font-semibold cursor-pointer shadow-xs"
            >
              Save Role
            </button>
          </div>
        </div>
      </Modal>

      {/* ─────────────────────────────────────────────────────────────
          RESET PASSWORD MODAL
      ───────────────────────────────────────────────────────────── */}
      <Modal
        isOpen={!!userForPasswordReset}
        onClose={() => setUserForPasswordReset(null)}
        title="Reset Password"
        maxWidth="md"
      >
        <div className="space-y-4">
          <p className="text-xs text-slate-600">
            Trigger a password reset email for{" "}
            <span className="font-semibold text-slate-900">{userForPasswordReset?.email}</span>?
            They will receive a secure token to set a new password.
          </p>

          <div className="pt-3 border-t border-slate-200 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setUserForPasswordReset(null)}
              className="px-3.5 py-1.5 border border-slate-200 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-50 cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleConfirmPasswordReset}
              className="px-3.5 py-1.5 bg-slate-900 hover:bg-black text-white rounded-xl text-xs font-semibold cursor-pointer shadow-xs"
            >
              Send Reset Link
            </button>
          </div>
        </div>
      </Modal>

      {/* ─────────────────────────────────────────────────────────────
          ROLE EDITOR DRAWER (PERMISSION MATRIX MATCHING CLIENT)
      ───────────────────────────────────────────────────────────── */}
      <DrawerShell
        isOpen={isRoleEditorOpen}
        onClose={() => setIsRoleEditorOpen(false)}
        title={editingRole ? `Edit Role: ${editingRole.name}` : "Create Admin Role"}
        subtitle="Configure module permissions and operational scoping levels"
        width="w-full sm:w-[720px] md:w-[840px]"
      >
        <form onSubmit={handleSaveRole} className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-bold uppercase tracking-wider text-slate-600 block mb-1">
                Role Name *
              </label>
              <input
                type="text"
                required
                value={formRoleName}
                onChange={(e) => setFormRoleName(e.target.value)}
                placeholder="e.g. Clinical Operations Lead"
                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-400"
              />
            </div>

            <div>
              <label className="text-xs font-bold uppercase tracking-wider text-slate-600 block mb-1">
                Description
              </label>
              <input
                type="text"
                value={formRoleDesc}
                onChange={(e) => setFormRoleDesc(e.target.value)}
                placeholder="Brief summary of duties and privileges"
                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-slate-400"
              />
            </div>
          </div>

          {/* Permission Matrix Table */}
          <div className="space-y-2">
            <div className="text-xs font-bold uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-slate-500" />
              Module Permissions Matrix
            </div>

            <div className="rounded-xl border border-gray-200 overflow-hidden shadow-2xs bg-white">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-[#1E293B] text-white text-[11px] font-bold uppercase tracking-wider">
                    <th className="py-3 px-4 w-[34%]">ADMIN MODULE</th>
                    <th className="py-3 px-4 w-[42%]">PERMISSIONS</th>
                    <th className="py-3 px-4 w-[24%]">LEVEL</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 text-xs">
                  {ADMIN_MODULES.map((mod) => {
                    const current = formPermissions[mod.id] || { actions: [], level: "all" };

                    return (
                      <tr key={mod.id} className="hover:bg-gray-50/70 transition-colors">
                        <td className="py-2.5 px-4 font-semibold text-gray-800 text-xs">
                          <div>
                            <span className="block text-slate-900">{mod.label}</span>
                            <span className="text-[10px] text-slate-400 font-normal uppercase tracking-wider">
                              {mod.group}
                            </span>
                          </div>
                        </td>
                        <td className="py-2 px-4">
                          <PermissionSelect
                            value={current.actions}
                            onChange={(actions) => {
                              setFormPermissions((prev) => ({
                                ...prev,
                                [mod.id]: {
                                  actions,
                                  level: current.level,
                                },
                              }));
                            }}
                          />
                        </td>
                        <td className="py-2 px-4">
                          <div className="relative">
                            <select
                              value={current.level}
                              onChange={(e) => {
                                const level = e.target.value as ScopeLevelOption;
                                setFormPermissions((prev) => ({
                                  ...prev,
                                  [mod.id]: {
                                    actions: current.actions,
                                    level,
                                  },
                                }));
                              }}
                              className="w-full h-8 px-2.5 pr-7 bg-white border border-gray-200 rounded-lg text-xs text-gray-700 font-medium appearance-none cursor-pointer outline-none focus:border-blue-500 transition-colors shadow-2xs"
                            >
                              <option value="all">All Records</option>
                              <option value="department">Role</option>
                              <option value="own">Own Records</option>
                              <option value="deny">Deny</option>
                            </select>
                            <ChevronDown className="w-3 h-3 text-gray-400 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          <div className="pt-4 border-t border-slate-200 flex items-center justify-end gap-2 sticky bottom-0 bg-white py-3">
            <button
              type="button"
              onClick={() => setIsRoleEditorOpen(false)}
              className="px-4 py-2 border border-slate-200 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-50 cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-slate-900 hover:bg-black text-white rounded-xl text-xs font-semibold cursor-pointer shadow-xs"
            >
              {editingRole ? "Save Role Changes" : "Create Role"}
            </button>
          </div>
        </form>
      </DrawerShell>
    </div>
  );
}
