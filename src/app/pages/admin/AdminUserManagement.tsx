/**
 * AdminUserManagement.tsx
 * Path: src/app/pages/admin/AdminUserManagement.tsx
 *
 * Dedicated Admin Console for User Management (/admin/settings/users):
 * - Table columns: Avatar + Name, Email, Role, Status, Last Login, Created, Actions ⋮
 * - Actions: Invite, Edit Role, Suspend/Reactivate, Reset Password, Resend Invite, Remove
 * - Filters: Role, Status, Search
 * - Invite/Edit Drawer following DESIGN.md
 * - All administrative mutations call recordAuditLog()
 */

import React, { useState, useEffect, useMemo, useCallback } from "react";
import PageHeader from "../../components/layout/PageHeader";
import PageTopBar from "../../components/layout/PageTopBar";
import TableComponent, { TableColumn, TableRowAction } from "../../components/ui/TableComponent";
import DrawerShell from "../../components/ui/DrawerShell";
import { Modal } from "../../components/ui/Modal";
import { recordAuditLog } from "../../../lib/auditLogsStore";
import { exportToCsv } from "../../../lib/productAnalyticsStore";
import {
  Users,
  UserPlus,
  Search,
  Filter,
  CheckCircle2,
  XCircle,
  KeyRound,
  Mail,
  Shield,
  Trash2,
  Edit2,
  Lock,
  Download,
  AlertTriangle,
  UserCheck,
  UserX,
} from "lucide-react";
import { toast } from "sonner";

export interface AdminUserItem {
  id: string;
  name: string;
  email: string;
  role: "SystemAdmin" | "Admin" | "BillingAdmin" | "SupportSpecialist" | "ReadonlyAuditor";
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
  const [users, setUsers] = useState<AdminUserItem[]>(getStoredAdminUsers);

  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");

  // Drawers & Modals
  const [showInviteDrawer, setShowInviteDrawer] = useState(false);
  const [editingUser, setEditingUser] = useState<AdminUserItem | null>(null);
  const [userToDelete, setUserToDelete] = useState<AdminUserItem | null>(null);

  // Invite Form State
  const [inviteName, setInviteName] = useState("");
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<AdminUserItem["role"]>("Admin");

  // Edit Form State
  const [editName, setEditName] = useState("");
  const [editRole, setEditRole] = useState<AdminUserItem["role"]>("Admin");
  const [editStatus, setEditStatus] = useState<AdminUserItem["status"]>("Active");

  const refresh = useCallback(() => {
    setUsers(getStoredAdminUsers());
  }, []);

  useEffect(() => {
    const handler = () => refresh();
    window.addEventListener(ADMIN_USERS_EVENT, handler);
    return () => window.removeEventListener(ADMIN_USERS_EVENT, handler);
  }, [refresh]);

  // Filtered list
  const filteredUsers = useMemo(() => {
    return users.filter((u) => {
      if (roleFilter !== "all" && u.role !== roleFilter) return false;
      if (statusFilter !== "all" && u.status !== statusFilter) return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesName = u.name.toLowerCase().includes(q);
        const matchesEmail = u.email.toLowerCase().includes(q);
        const matchesRole = u.role.toLowerCase().includes(q);
        if (!matchesName && !matchesEmail && !matchesRole) return false;
      }

      return true;
    });
  }, [users, roleFilter, statusFilter, searchQuery]);

  // Handlers
  const handleInviteUser = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteName.trim() || !inviteEmail.trim()) {
      toast.error("Please fill in all required fields");
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
      targetName: `${newUser.name} (${newUser.email})`,
      summary: `Sent platform administrator invitation to ${newUser.name} with ${newUser.role} privileges`,
      before: null,
      after: { email: newUser.email, role: newUser.role, status: newUser.status },
    });

    setInviteName("");
    setInviteEmail("");
    setShowInviteDrawer(false);
    toast.success(`Invitation email dispatched to ${newUser.email}`);
  };

  const handleOpenEdit = (user: AdminUserItem) => {
    setEditingUser(user);
    setEditName(user.name);
    setEditRole(user.role);
    setEditStatus(user.status);
  };

  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;

    const prev = editingUser;
    const updatedUsers = users.map((u) =>
      u.id === editingUser.id
        ? { ...u, name: editName.trim(), role: editRole, status: editStatus }
        : u
    );

    saveStoredAdminUsers(updatedUsers);

    recordAuditLog({
      actorId: "usr-admin-1",
      actorName: "Alexander Vance",
      actorEmail: "alexander.v@mantra.care",
      actorRole: "SystemAdmin",
      action: "updated",
      module: "Users",
      entityType: "AdminUser",
      entityId: editingUser.id,
      targetName: editName,
      summary: `Updated admin profile and role for ${editName} (${prev.role} → ${editRole})`,
      before: { name: prev.name, role: prev.role, status: prev.status },
      after: { name: editName, role: editRole, status: editStatus },
    });

    setEditingUser(null);
    toast.success(`Saved profile updates for ${editName}`);
  };

  const handleToggleSuspend = (user: AdminUserItem) => {
    const newStatus = user.status === "Active" ? "Suspended" : "Active";
    const action = newStatus === "Suspended" ? "suspended" : "reactivated";

    const updated = users.map((u) =>
      u.id === user.id ? { ...u, status: newStatus as AdminUserItem["status"] } : u
    );
    saveStoredAdminUsers(updated);

    recordAuditLog({
      actorId: "usr-admin-1",
      actorName: "Alexander Vance",
      actorEmail: "alexander.v@mantra.care",
      actorRole: "SystemAdmin",
      action,
      module: "Users",
      entityType: "AdminUser",
      entityId: user.id,
      targetName: user.name,
      summary: `${newStatus === "Suspended" ? "Suspended" : "Reactivated"} administrative console login for ${user.name}`,
      before: { status: user.status },
      after: { status: newStatus },
    });

    toast.success(`User ${user.name} is now ${newStatus}`);
  };

  const handleResetPassword = (user: AdminUserItem) => {
    recordAuditLog({
      actorId: "usr-admin-1",
      actorName: "Alexander Vance",
      actorEmail: "alexander.v@mantra.care",
      actorRole: "SystemAdmin",
      action: "reset_password",
      module: "Users",
      entityType: "AdminUser",
      entityId: user.id,
      targetName: user.name,
      summary: `Triggered emergency password reset link dispatch for ${user.name} (${user.email})`,
      before: null,
      after: { email: user.email, resetTriggered: true },
    });

    toast.success(`Password reset link emailed to ${user.email}`);
  };

  const handleResendInvite = (user: AdminUserItem) => {
    recordAuditLog({
      actorId: "usr-admin-1",
      actorName: "Alexander Vance",
      actorEmail: "alexander.v@mantra.care",
      actorRole: "SystemAdmin",
      action: "invite_sent",
      module: "Users",
      entityType: "AdminUser",
      entityId: user.id,
      targetName: user.name,
      summary: `Re-sent pending administrative activation invite to ${user.email}`,
      before: null,
      after: { email: user.email },
    });

    toast.success(`Re-sent invitation email to ${user.email}`);
  };

  const handleConfirmDelete = () => {
    if (!userToDelete) return;

    const target = userToDelete;
    const updated = users.filter((u) => u.id !== target.id);
    saveStoredAdminUsers(updated);

    recordAuditLog({
      actorId: "usr-admin-1",
      actorName: "Alexander Vance",
      actorEmail: "alexander.v@mantra.care",
      actorRole: "SystemAdmin",
      action: "deleted",
      module: "Users",
      entityType: "AdminUser",
      entityId: target.id,
      targetName: target.name,
      summary: `Permanently removed administrative user ${target.name} (${target.email})`,
      before: { name: target.name, email: target.email, role: target.role },
      after: null,
    });

    setUserToDelete(null);
    toast.success(`Removed ${target.name} from admin team`);
  };

  const handleExportCsv = () => {
    const headers = ["Name", "Email", "Role", "Status", "Last Login", "Created Date"];
    const rows = filteredUsers.map((u) => [
      u.name,
      u.email,
      u.role,
      u.status,
      u.lastLogin ? new Date(u.lastLogin).toLocaleString() : "Never",
      new Date(u.createdDate).toLocaleDateString(),
    ]);
    exportToCsv("mantra-admin-users", headers, rows);
    toast.success("Exported users list to CSV");
  };

  // Table Columns
  const columns: TableColumn<AdminUserItem>[] = [
    {
      key: "name",
      header: "ADMIN USER",
      render: (row) => (
        <div className="flex items-center gap-2.5">
          <div
            className={`w-7 h-7 rounded-lg text-white font-bold text-xs flex items-center justify-center shrink-0 ${
              row.avatarColor || "bg-blue-600"
            }`}
          >
            {row.name.substring(0, 2).toUpperCase()}
          </div>
          <div className="truncate">
            <span className="text-xs font-semibold text-gray-900 block truncate max-w-[160px]">
              {row.name}
            </span>
          </div>
        </div>
      ),
    },
    {
      key: "email",
      header: "EMAIL ADDRESS",
      render: (row) => (
        <span className="text-xs font-mono text-gray-700">{row.email}</span>
      ),
    },
    {
      key: "role",
      header: "SECURITY ROLE",
      render: (row) => {
        let roleStyle = "bg-slate-100 text-slate-700";
        if (row.role === "SystemAdmin") roleStyle = "bg-rose-50 text-rose-800 border-rose-200/60";
        if (row.role === "Admin") roleStyle = "bg-blue-50 text-blue-800 border-blue-200/60";
        if (row.role === "BillingAdmin") roleStyle = "bg-emerald-50 text-emerald-800 border-emerald-200/60";
        if (row.role === "SupportSpecialist") roleStyle = "bg-amber-50 text-amber-800 border-amber-200/60";
        if (row.role === "ReadonlyAuditor") roleStyle = "bg-purple-50 text-purple-800 border-purple-200/60";

        return (
          <span className={`inline-flex items-center text-[11px] font-semibold px-2 py-0.5 rounded-full border ${roleStyle}`}>
            {row.role}
          </span>
        );
      },
    },
    {
      key: "status",
      header: "STATUS",
      render: (row) => {
        if (row.status === "Active") {
          return (
            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200/60">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Active
            </span>
          );
        }
        if (row.status === "Invited") {
          return (
            <span className="inline-flex items-center text-[11px] font-semibold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-200/60">
              Invited
            </span>
          );
        }
        return (
          <span className="inline-flex items-center text-[11px] font-semibold text-rose-700 bg-rose-50 px-2 py-0.5 rounded-full border border-rose-200/60">
            Suspended
          </span>
        );
      },
    },
    {
      key: "lastLogin",
      header: "LAST LOGIN",
      render: (row) => (
        <span className="text-xs text-gray-600 font-mono tabular-nums whitespace-nowrap">
          {row.lastLogin ? new Date(row.lastLogin).toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }) : "Never"}
        </span>
      ),
    },
    {
      key: "createdDate",
      header: "CREATED",
      render: (row) => (
        <span className="text-xs text-gray-500 font-mono tabular-nums whitespace-nowrap">
          {new Date(row.createdDate).toLocaleDateString()}
        </span>
      ),
    },
  ];

  // Table Row Actions (⋮)
  const rowActions: TableRowAction<AdminUserItem>[] = [
    {
      label: "Edit Role & Details",
      icon: <Edit2 className="w-3.5 h-3.5 text-blue-600" />,
      onClick: (item) => handleOpenEdit(item),
    },
    {
      label: "Suspend Access",
      icon: <UserX className="w-3.5 h-3.5 text-amber-600" />,
      hidden: (item) => item.status === "Suspended",
      onClick: (item) => handleToggleSuspend(item),
    },
    {
      label: "Reactivate User",
      icon: <UserCheck className="w-3.5 h-3.5 text-emerald-600" />,
      hidden: (item) => item.status !== "Suspended",
      onClick: (item) => handleToggleSuspend(item),
    },
    {
      label: "Reset Password",
      icon: <KeyRound className="w-3.5 h-3.5 text-indigo-600" />,
      onClick: (item) => handleResetPassword(item),
    },
    {
      label: "Resend Invite",
      icon: <Mail className="w-3.5 h-3.5 text-blue-600" />,
      disabled: (item) => item.status !== "Invited",
      onClick: (item) => handleResendInvite(item),
    },
    {
      label: "Remove Admin",
      icon: <Trash2 className="w-3.5 h-3.5 text-rose-600" />,
      onClick: (item) => setUserToDelete(item),
    },
  ];

  return (
    <div className="flex-1 flex flex-col min-w-0 bg-[#fafafa]">
      <PageHeader
        title="User Management"
        subtitle="Manage administrative accounts, role-based security scopes, and credential life-cycles"
        actions={
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleExportCsv}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors cursor-pointer shadow-2xs"
            >
              <Download className="w-3.5 h-3.5 text-slate-500" />
              Export CSV
            </button>
            <button
              type="button"
              onClick={() => setShowInviteDrawer(true)}
              className="inline-flex items-center gap-1.5 px-4 py-1.5 text-xs font-semibold text-white bg-[#1E293B] hover:bg-slate-800 rounded-xl transition-colors cursor-pointer shadow-xs"
            >
              <UserPlus className="w-3.5 h-3.5" />
              Invite Admin
            </button>
          </div>
        }
      />

      <div className="p-6 space-y-5">
        {/* Filters Toolbar */}
        <div className="bg-white rounded-2xl border border-gray-200/90 p-4 shadow-xs">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search name, email, or role..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-blue-500 focus:bg-white transition-colors"
              />
            </div>

            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="px-3 py-1.5 text-xs bg-white border border-slate-200 rounded-xl text-gray-700 focus:outline-none cursor-pointer"
            >
              <option value="all">All Roles</option>
              <option value="SystemAdmin">SystemAdmin</option>
              <option value="Admin">Admin</option>
              <option value="BillingAdmin">BillingAdmin</option>
              <option value="SupportSpecialist">SupportSpecialist</option>
              <option value="ReadonlyAuditor">ReadonlyAuditor</option>
            </select>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-1.5 text-xs bg-white border border-slate-200 rounded-xl text-gray-700 focus:outline-none cursor-pointer"
            >
              <option value="all">All Statuses</option>
              <option value="Active">Active</option>
              <option value="Suspended">Suspended</option>
              <option value="Invited">Invited</option>
            </select>
          </div>
        </div>

        {/* Users Table */}
        <TableComponent
          data={filteredUsers}
          columns={columns}
          rowActions={rowActions}
          actionIcon="menu"
          defaultRowsPerPage={20}
        />
      </div>

      {/* Invite Admin Drawer */}
      <DrawerShell
        isOpen={showInviteDrawer}
        onClose={() => setShowInviteDrawer(false)}
        title="Invite Administrator"
        subtitle="Grant operational access to the MantraAssist management console"
        width="max-w-md"
        icon={<UserPlus className="w-5 h-5 text-blue-600" />}
      >
        <form onSubmit={handleInviteUser} className="p-6 space-y-4">
          <div>
            <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
              Full Name
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Dr. Jordan Reed"
              value={inviteName}
              onChange={(e) => setInviteName(e.target.value)}
              className="w-full px-3.5 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
              Work Email Address
            </label>
            <input
              type="email"
              required
              placeholder="jordan.r@mantra.care"
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
              className="w-full px-3.5 py-2 text-xs font-mono border border-slate-200 rounded-xl focus:outline-none focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
              Administrative Role
            </label>
            <select
              value={inviteRole}
              onChange={(e) => setInviteRole(e.target.value as AdminUserItem["role"])}
              className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl bg-white focus:outline-none focus:border-blue-500"
            >
              <option value="Admin">Admin (Full Operational Scope)</option>
              <option value="SystemAdmin">SystemAdmin (Trunks, Billing, Security)</option>
              <option value="BillingAdmin">BillingAdmin (Invoices & Subscriptions)</option>
              <option value="SupportSpecialist">SupportSpecialist (Tenant & DID routing)</option>
              <option value="ReadonlyAuditor">ReadonlyAuditor (Audit logs & Reports)</option>
            </select>
          </div>

          <div className="p-3 bg-blue-50 rounded-xl border border-blue-200/60 text-xs text-blue-800 flex items-start gap-2">
            <Shield className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
            <span>
              Invited user will receive a secure activation link with mandatory two-factor authentication enrollment.
            </span>
          </div>

          <div className="pt-4 flex justify-end gap-2 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setShowInviteDrawer(false)}
              className="px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-1.5 text-xs font-semibold text-white bg-[#1E293B] hover:bg-slate-800 rounded-xl transition-colors cursor-pointer shadow-xs"
            >
              Dispatch Invitation
            </button>
          </div>
        </form>
      </DrawerShell>

      {/* Edit Role & Details Drawer */}
      <DrawerShell
        isOpen={!!editingUser}
        onClose={() => setEditingUser(null)}
        title={`Edit ${editingUser?.name}`}
        subtitle={`Admin User ID: ${editingUser?.id}`}
        width="max-w-md"
        icon={<Edit2 className="w-5 h-5 text-blue-600" />}
      >
        {editingUser && (
          <form onSubmit={handleSaveEdit} className="p-6 space-y-4">
            <div>
              <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                Full Name
              </label>
              <input
                type="text"
                required
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                className="w-full px-3.5 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                Security Role
              </label>
              <select
                value={editRole}
                onChange={(e) => setEditRole(e.target.value as AdminUserItem["role"])}
                className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl bg-white focus:outline-none focus:border-blue-500"
              >
                <option value="Admin">Admin</option>
                <option value="SystemAdmin">SystemAdmin</option>
                <option value="BillingAdmin">BillingAdmin</option>
                <option value="SupportSpecialist">SupportSpecialist</option>
                <option value="ReadonlyAuditor">ReadonlyAuditor</option>
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                Account Status
              </label>
              <select
                value={editStatus}
                onChange={(e) => setEditStatus(e.target.value as AdminUserItem["status"])}
                className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl bg-white focus:outline-none focus:border-blue-500"
              >
                <option value="Active">Active</option>
                <option value="Suspended">Suspended</option>
                <option value="Invited">Invited</option>
              </select>
            </div>

            <div className="pt-4 flex justify-end gap-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setEditingUser(null)}
                className="px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-1.5 text-xs font-semibold text-white bg-[#1E293B] hover:bg-slate-800 rounded-xl transition-colors cursor-pointer shadow-xs"
              >
                Save Changes
              </button>
            </div>
          </form>
        )}
      </DrawerShell>

      {/* Delete Confirmation Modal */}
      {userToDelete && (
        <Modal
          isOpen={true}
          onClose={() => setUserToDelete(null)}
          title={`Remove ${userToDelete.name}?`}
          maxWidth="md"
        >
          <div className="space-y-4">
            <p className="text-xs text-slate-600">
              Are you sure you want to permanently remove{" "}
              <strong className="text-slate-900">{userToDelete.name}</strong> ({userToDelete.email})
              from the MantraAssist Admin Console? This action cannot be undone.
            </p>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setUserToDelete(null)}
                className="px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                className="px-4 py-1.5 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 rounded-xl transition-colors cursor-pointer shadow-xs"
              >
                Confirm Removal
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

