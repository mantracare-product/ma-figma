import { useState, useEffect } from "react";
import { Plus, CreditCard, LayoutDashboard, Users, Phone, GitBranch, Hash, Receipt, Webhook, Settings, Shield, Trash2, Edit, AlertCircle } from "lucide-react";
import { Button } from "../components/ui/Button";
import { Input } from "../components/ui/Input";
import { Modal } from "../components/ui/Modal";
import { Tooltip } from "../components/ui/Tooltip";
import { toast } from "sonner";
import { useNavigate } from "react-router";
import PageHeader from "../components/layout/PageHeader";

type PermissionLevel = "none" | "read" | "write" | "full";

interface Permissions {
  dashboard: PermissionLevel;
  clients: PermissionLevel;
  calls: PermissionLevel;
  processes: PermissionLevel;
  numbers: PermissionLevel;
  billing: PermissionLevel;
  webhooks: PermissionLevel;
  settings: PermissionLevel;
}

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  credits: number;
  maxCredits: number;
  status: string;
  permissions: Permissions;
}

const defaultPermissions: Permissions = {
  dashboard: "read",
  clients: "read",
  calls: "read",
  processes: "none",
  numbers: "none",
  billing: "none",
  webhooks: "none",
  settings: "none",
};

const adminPermissions: Permissions = {
  dashboard: "full",
  clients: "full",
  calls: "full",
  processes: "full",
  numbers: "full",
  billing: "full",
  webhooks: "full",
  settings: "full",
};

const initialUsers: User[] = [
  { id: "1", name: "Admin User", email: "admin@healthcare.com", role: "Admin", credits: 450, maxCredits: 1000, status: "Active", permissions: adminPermissions },
  { id: "2", name: "Sarah Manager", email: "sarah.m@healthcare.com", role: "Manager", credits: 280, maxCredits: 500, status: "Active", permissions: { ...defaultPermissions, clients: "write", calls: "write", processes: "read" } },
  { id: "3", name: "John Agent", email: "john.a@healthcare.com", role: "Agent", credits: 120, maxCredits: 250, status: "Active", permissions: defaultPermissions },
];

export default function UserManagement() {
  const navigate = useNavigate();
  const [users, setUsers] = useState<User[]>(() => {
    const saved = sessionStorage.getItem("userManagement_users");
    return saved ? JSON.parse(saved) : initialUsers;
  });

  useEffect(() => {
    sessionStorage.setItem("userManagement_users", JSON.stringify(users));
  }, [users]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditUserModal, setShowEditUserModal] = useState(false);
  const [showPermissionsModal, setShowPermissionsModal] = useState(false);
  const [showCreditModal, setShowCreditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showStatusConfirmModal, setShowStatusConfirmModal] = useState(false);
  const [showUserLimitModal, setShowUserLimitModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [editingPermissionsUser, setEditingPermissionsUser] = useState<User | null>(null);
  const [userToDelete, setUserToDelete] = useState<User | null>(null);
  const [userToToggleStatus, setUserToToggleStatus] = useState<User | null>(null);
  const [newUser, setNewUser] = useState({ name: "", email: "", role: "Agent" });
  const [creditAmount, setCreditAmount] = useState("");

  // Plan limits (in a real app, this would come from a context or API)
  const planUserLimit = 3; // Professional plan supports 3 users

  const handleAddUser = () => {
    if (!newUser.name || !newUser.email) {
      toast.error("Please fill all fields");
      return;
    }

    const user: User = {
      id: String(users.length + 1),
      ...newUser,
      credits: 0,
      maxCredits: 250,
      status: "Active",
      permissions: { ...defaultPermissions },
    };

    setUsers([user, ...users]);
    setNewUser({ name: "", email: "", role: "Agent" });
    setShowAddModal(false);
    toast.success("User added successfully");
  };

  const handleEditUser = () => {
    if (!editingUser || !editingUser.name || !editingUser.role) {
      toast.error("Please fill all fields");
      return;
    }

    setUsers(
      users.map((u) =>
        u.id === editingUser.id
          ? { ...u, name: editingUser.name, role: editingUser.role, status: editingUser.status }
          : u
      )
    );
    setShowEditUserModal(false);
    setEditingUser(null);
    toast.success("User updated successfully");
  };

  const handleUpdatePermissions = () => {
    if (!editingPermissionsUser) {
      toast.error("Please select a user");
      return;
    }

    setUsers(
      users.map((u) =>
        u.id === editingPermissionsUser.id
          ? { ...u, permissions: editingPermissionsUser.permissions }
          : u
      )
    );
    setShowPermissionsModal(false);
    setEditingPermissionsUser(null);
    toast.success("Permissions updated successfully");
  };

  const handlePermissionChange = (module: keyof Permissions, level: PermissionLevel) => {
    if (!editingPermissionsUser) return;
    setEditingPermissionsUser({
      ...editingPermissionsUser,
      permissions: {
        ...editingPermissionsUser.permissions,
        [module]: level,
      },
    });
  };

  const handleGrantFullAccess = () => {
    if (!editingPermissionsUser) return;
    setEditingPermissionsUser({
      ...editingPermissionsUser,
      permissions: { ...adminPermissions },
    });
    toast.success("Full access granted to all modules");
  };

  const handleResetPermissions = () => {
    if (!editingPermissionsUser) return;
    setEditingPermissionsUser({
      ...editingPermissionsUser,
      permissions: { ...defaultPermissions },
    });
    toast.success("Permissions reset to defaults");
  };

  const handleDeleteUser = () => {
    if (!userToDelete) return;

    setUsers(users.filter((u) => u.id !== userToDelete.id));
    setShowDeleteModal(false);
    setUserToDelete(null);
    toast.success("User deleted successfully");
  };

  const handleToggleStatus = (user: User) => {
    // If trying to deactivate, show confirmation
    if (user.status === "Active") {
      setUserToToggleStatus(user);
      setShowStatusConfirmModal(true);
    } else {
      // Check if activating user would exceed plan limit
      const currentActiveUsers = users.filter((u) => u.status === "Active").length;
      if (currentActiveUsers >= planUserLimit) {
        setUserToToggleStatus(user);
        setShowUserLimitModal(true);
      } else {
        // Activating user - no confirmation needed
        setUsers(
          users.map((u) =>
            u.id === user.id ? { ...u, status: "Active" } : u
          )
        );
        toast.success("User activated successfully");
      }
    }
  };

  const confirmStatusToggle = () => {
    if (!userToToggleStatus) return;

    setUsers(
      users.map((u) =>
        u.id === userToToggleStatus.id ? { ...u, status: "Inactive" } : u
      )
    );
    setShowStatusConfirmModal(false);
    setUserToToggleStatus(null);
    toast.success("User status updated");
  };

  const handleAddCredits = () => {
    if (!selectedUser || !creditAmount) return;

    const amount = parseInt(creditAmount);
    if (isNaN(amount) || amount <= 0) {
      toast.error("Please enter a valid amount");
      return;
    }

    setUsers(
      users.map((u) =>
        u.id === selectedUser.id
          ? { ...u, maxCredits: u.maxCredits + amount }
          : u
      )
    );
    setShowCreditModal(false);
    setCreditAmount("");
    toast.success("Credit limit increased successfully");
  };

  return (
    <div className="p-6 space-y-6">
      <PageHeader
        title="User Management"
        subtitle="Manage users and their credits"
      >
        <Button variant="primary" onClick={() => setShowAddModal(true)}>
          <Plus className="w-4 h-4" />
          Add User
        </Button>
      </PageHeader>

      <div className="bg-card rounded-xl border border-border shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-muted border-b border-border">
              <tr>
                <th className="px-6 py-4 text-left text-sm font-semibold">User</th>
                <th className="px-6 py-4 text-left text-sm font-semibold">Credits (Used / Total)</th>
                <th className="px-6 py-4 text-left text-sm font-semibold">Usage</th>
                <th className="px-6 py-4 text-left text-sm font-semibold">Status</th>
                <th className="px-6 py-4 text-right text-sm font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {users.map((user) => (
                <tr key={user.id} className="hover:bg-muted transition-colors">
                  <td className="px-6 py-4">
                    <div>
                      <p className="font-medium">{user.name}</p>
                      <p className="text-sm text-muted-foreground">{user.email}</p>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-baseline gap-1">
                      <span className="font-semibold text-foreground">{user.credits}</span>
                      <span className="text-muted-foreground">/</span>
                      <span className="font-medium text-muted-foreground">{user.maxCredits}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="w-full">
                      <div className="h-2 bg-border rounded-full overflow-hidden">
                        <div
                          className="h-full bg-primary"
                          style={{ width: `${(user.credits / user.maxCredits) * 100}%` }}
                        />
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        {Math.round((user.credits / user.maxCredits) * 100)}% used
                      </p>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          className="sr-only peer"
                          checked={user.status === "Active"}
                          onChange={() => handleToggleStatus(user)}
                        />
                        <div className="w-11 h-6 bg-[#E5E7EB] peer-focus:ring-2 peer-focus:ring-primary rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                      </label>
                      <span className={`text-sm font-medium ${
                        user.status === "Active" ? "text-success" : "text-muted-foreground"
                      }`}>
                        {user.status}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center justify-end gap-3">
                      <Tooltip text="Manage Permissions">
                        <button
                          onClick={() => {
                            setEditingPermissionsUser(user);
                            setShowPermissionsModal(true);
                          }}
                          className="p-2 hover:bg-primary/10 rounded-lg transition-colors text-[#6B7280] hover:text-primary"
                        >
                          <Shield className="w-[18px] h-[18px]" />
                        </button>
                      </Tooltip>
                      <Tooltip text="Manage Credits">
                        <button
                          onClick={() => {
                            setSelectedUser(user);
                            setShowCreditModal(true);
                          }}
                          className="p-2 hover:bg-primary/10 rounded-lg transition-colors text-[#6B7280] hover:text-primary"
                        >
                          <CreditCard className="w-[18px] h-[18px]" />
                        </button>
                      </Tooltip>
                      <Tooltip text="Delete User">
                        <button
                          onClick={() => {
                            setUserToDelete(user);
                            setShowDeleteModal(true);
                          }}
                          className="p-2 hover:bg-destructive/10 rounded-lg transition-colors text-[#6B7280] hover:text-[#DC2626]"
                        >
                          <Trash2 className="w-[18px] h-[18px]" />
                        </button>
                      </Tooltip>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <Modal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        title="Add New User"
        footer={
          <>
            <Button variant="outline" onClick={() => setShowAddModal(false)}>
              Cancel
            </Button>
            <Button variant="primary" onClick={handleAddUser}>
              Add User
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <Input
            label="Name"
            value={newUser.name}
            onChange={(e) => setNewUser({ ...newUser, name: e.target.value })}
            placeholder="Enter user name"
          />
          <Input
            label="Email"
            type="email"
            value={newUser.email}
            onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
            placeholder="user@email.com"
          />
          <div>
            <label className="block text-sm font-medium mb-2">Role</label>
            <select
              value={newUser.role}
              onChange={(e) => setNewUser({ ...newUser, role: e.target.value })}
              className="w-full px-4 py-2 bg-input-background border border-input rounded-xl"
            >
              <option value="Agent">Agent</option>
              <option value="Manager">Manager</option>
              <option value="Admin">Admin</option>
            </select>
          </div>
        </div>
      </Modal>

      {/* Edit User Modal */}
      <Modal
        isOpen={showEditUserModal}
        onClose={() => {
          setShowEditUserModal(false);
          setEditingUser(null);
        }}
        title="Edit User"
        footer={
          <>
            <Button variant="outline" onClick={() => {
              setShowEditUserModal(false);
              setEditingUser(null);
            }}>
              Cancel
            </Button>
            <Button variant="primary" onClick={handleEditUser}>
              Save Changes
            </Button>
          </>
        }
      >
        {editingUser && (
          <div className="space-y-6">
            {/* User Details Section */}
            <div className="space-y-4">
              <Input
                label="Name"
                value={editingUser.name}
                onChange={(e) => setEditingUser({ ...editingUser, name: e.target.value })}
                placeholder="Enter user name"
              />

              <div>
                <label className="block text-sm font-medium mb-2">Email</label>
                <input
                  type="email"
                  value={editingUser.email}
                  disabled
                  className="w-full px-4 py-2 bg-muted border border-input rounded-xl text-muted-foreground cursor-not-allowed"
                />
                <p className="text-xs text-muted-foreground mt-1">Email cannot be changed</p>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Role</label>
                <select
                  value={editingUser.role}
                  onChange={(e) => setEditingUser({ ...editingUser, role: e.target.value })}
                  className="w-full px-4 py-2 bg-input-background border border-input rounded-xl"
                >
                  <option value="Agent">Agent</option>
                  <option value="Manager">Manager</option>
                  <option value="Admin">Admin</option>
                </select>
              </div>
            </div>

            {/* User Status Section */}
            <div className="p-4 bg-[#F9FAFB] border border-[#E5E7EB] rounded-xl">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <p className="font-medium text-foreground">User Status</p>
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${
                      editingUser.status === "Active"
                        ? "bg-success-bg text-success"
                        : "bg-muted text-muted-foreground"
                    }`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${
                        editingUser.status === "Active" ? "bg-success" : "bg-muted-foreground"
                      }`}></span>
                      {editingUser.status}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {editingUser.status === "Active"
                      ? "User can log in and use the system"
                      : "User access is disabled"}
                  </p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer flex-shrink-0">
                  <input
                    type="checkbox"
                    className="sr-only peer"
                    checked={editingUser.status === "Active"}
                    onChange={(e) =>
                      setEditingUser({
                        ...editingUser,
                        status: e.target.checked ? "Active" : "Inactive",
                      })
                    }
                  />
                  <div className="w-11 h-6 bg-switch-background peer-focus:ring-2 peer-focus:ring-primary rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-switch-background after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                </label>
              </div>
            </div>
          </div>
        )}
      </Modal>

      {/* Manage Permissions Modal */}
      <Modal
        isOpen={showPermissionsModal}
        onClose={() => {
          setShowPermissionsModal(false);
          setEditingPermissionsUser(null);
        }}
        title="Manage Permissions"
        maxWidth="xl"
        footer={
          <>
            <Button variant="outline" onClick={() => {
              setShowPermissionsModal(false);
              setEditingPermissionsUser(null);
            }}>
              Cancel
            </Button>
            <Button variant="primary" onClick={handleUpdatePermissions}>
              Save Changes
            </Button>
          </>
        }
      >
        {editingPermissionsUser && (
          <div className="space-y-6">
            {/* User Info Header */}
            <div className="flex items-center gap-4 p-5 bg-muted rounded-xl">
              <div className="w-14 h-14 bg-primary/10 rounded-full flex items-center justify-center flex-shrink-0">
                <Users className="w-7 h-7 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-lg text-foreground">{editingPermissionsUser.name}</p>
                <p className="text-sm text-muted-foreground truncate mt-0.5">{editingPermissionsUser.email}</p>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="flex items-center justify-between pt-2 pb-4 border-b border-border">
              <h3 className="text-base font-semibold text-foreground">Module Permissions</h3>
              <div className="flex gap-3">
                <button
                  onClick={handleResetPermissions}
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors px-3 py-1.5 hover:bg-muted rounded-lg"
                >
                  Reset
                </button>
                <button
                  onClick={handleGrantFullAccess}
                  className="text-sm text-primary hover:text-primary-hover transition-colors px-3 py-1.5 hover:bg-primary/10 rounded-lg font-medium"
                >
                  Grant Full Access
                </button>
              </div>
            </div>

            {/* Permission Groups */}
            <div className="space-y-8 pt-2">
              {/* CORE Section */}
              <div>
                <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-4">
                  Core
                </h4>
                <div className="space-y-3">
                  <PermissionRow
                    icon={<LayoutDashboard className="w-5 h-5" />}
                    label="Dashboard"
                    module="dashboard"
                    currentLevel={editingPermissionsUser.permissions.dashboard}
                    onChange={handlePermissionChange}
                  />
                  <PermissionRow
                    icon={<Users className="w-5 h-5" />}
                    label="Clients"
                    module="clients"
                    currentLevel={editingPermissionsUser.permissions.clients}
                    onChange={handlePermissionChange}
                  />
                  <PermissionRow
                    icon={<Phone className="w-5 h-5" />}
                    label="Calls"
                    module="calls"
                    currentLevel={editingPermissionsUser.permissions.calls}
                    onChange={handlePermissionChange}
                  />
                </div>
              </div>

              {/* OPERATIONS Section */}
              <div>
                <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-4">
                  Operations
                </h4>
                <div className="space-y-3">
                  <PermissionRow
                    icon={<GitBranch className="w-5 h-5" />}
                    label="Processes"
                    module="processes"
                    currentLevel={editingPermissionsUser.permissions.processes}
                    onChange={handlePermissionChange}
                  />
                  <PermissionRow
                    icon={<Hash className="w-5 h-5" />}
                    label="Numbers"
                    module="numbers"
                    currentLevel={editingPermissionsUser.permissions.numbers}
                    onChange={handlePermissionChange}
                  />
                </div>
              </div>

              {/* SYSTEM Section */}
              <div>
                <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-4">
                  System
                </h4>
                <div className="space-y-3">
                  <PermissionRow
                    icon={<Receipt className="w-5 h-5" />}
                    label="Billing"
                    module="billing"
                    currentLevel={editingPermissionsUser.permissions.billing}
                    onChange={handlePermissionChange}
                  />
                  <PermissionRow
                    icon={<Webhook className="w-5 h-5" />}
                    label="Webhooks"
                    module="webhooks"
                    currentLevel={editingPermissionsUser.permissions.webhooks}
                    onChange={handlePermissionChange}
                  />
                  <PermissionRow
                    icon={<Settings className="w-5 h-5" />}
                    label="Settings"
                    module="settings"
                    currentLevel={editingPermissionsUser.permissions.settings}
                    onChange={handlePermissionChange}
                  />
                </div>
              </div>
            </div>
          </div>
        )}
      </Modal>

      <Modal
        isOpen={showCreditModal}
        onClose={() => {
          setShowCreditModal(false);
          setCreditAmount("");
        }}
        title="Manage Credits"
        footer={
          <>
            <Button variant="outline" onClick={() => {
              setShowCreditModal(false);
              setCreditAmount("");
            }}>
              Cancel
            </Button>
            <Button variant="primary" onClick={handleAddCredits}>
              Increase Limit
            </Button>
          </>
        }
      >
        <div className="space-y-5">
          <div className="p-4 bg-muted rounded-xl">
            <p className="text-sm text-muted-foreground mb-1">User</p>
            <p className="font-semibold text-lg">{selectedUser?.name}</p>
            <p className="text-sm text-muted-foreground mt-0.5">{selectedUser?.email}</p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 bg-muted/50 rounded-xl border border-border">
              <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Used Credits</p>
              <p className="text-2xl font-bold text-foreground">{selectedUser?.credits}</p>
            </div>
            <div className="p-4 bg-muted/50 rounded-xl border border-border">
              <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Total Credits</p>
              <p className="text-2xl font-bold text-foreground">{selectedUser?.maxCredits}</p>
            </div>
          </div>

          <div className="p-4 bg-primary/5 border border-primary/20 rounded-xl">
            <div className="flex items-start gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-primary mt-2 flex-shrink-0"></div>
              <p className="text-sm text-muted-foreground">
                {selectedUser && selectedUser.credits < selectedUser.maxCredits ? (
                  <>
                    <strong>{selectedUser.maxCredits - selectedUser.credits} credits available</strong>
                    {" "}({Math.round(((selectedUser.maxCredits - selectedUser.credits) / selectedUser.maxCredits) * 100)}% remaining)
                  </>
                ) : (
                  <strong className="text-warning">Credit limit reached</strong>
                )}
              </p>
            </div>
          </div>

          <Input
            label="Increase Credit Limit"
            type="number"
            value={creditAmount}
            onChange={(e) => setCreditAmount(e.target.value)}
            placeholder="Enter amount to add"
          />
          <p className="text-xs text-muted-foreground -mt-2">
            Adds more credits to user's total allocation. Used credits remain unchanged.
          </p>
        </div>
      </Modal>

      {/* Delete User Confirmation Modal */}
      <Modal
        isOpen={showDeleteModal}
        onClose={() => {
          setShowDeleteModal(false);
          setUserToDelete(null);
        }}
        title="Delete User"
        footer={
          <>
            <Button variant="outline" onClick={() => {
              setShowDeleteModal(false);
              setUserToDelete(null);
            }}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDeleteUser}>
              Delete User
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <div className="flex items-start gap-3 p-4 bg-destructive/10 border border-destructive/30 rounded-xl">
            <Trash2 className="w-5 h-5 text-destructive flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-medium text-destructive">This action cannot be undone</p>
              <p className="text-sm text-destructive/80 mt-1">
                All user data, permissions, and credit history will be permanently deleted.
              </p>
            </div>
          </div>
          <div>
            <p className="text-foreground">
              Are you sure you want to delete <strong>{userToDelete?.name}</strong>?
            </p>
            <p className="text-sm text-muted-foreground mt-1">{userToDelete?.email}</p>
          </div>
        </div>
      </Modal>

      {/* Disable User Status Confirmation Modal */}
      <Modal
        isOpen={showStatusConfirmModal}
        onClose={() => {
          setShowStatusConfirmModal(false);
          setUserToToggleStatus(null);
        }}
        title="Disable User Access"
        footer={
          <>
            <Button variant="outline" onClick={() => {
              setShowStatusConfirmModal(false);
              setUserToToggleStatus(null);
            }}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={confirmStatusToggle}>
              Disable Access
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <div className="flex items-start gap-3 p-4 bg-warning-bg border border-warning/30 rounded-xl">
            <AlertCircle className="w-5 h-5 text-warning flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-medium text-warning">User will lose system access</p>
              <p className="text-sm text-warning/80 mt-1">
                The user will be immediately logged out and cannot access the system.
              </p>
            </div>
          </div>
          <div>
            <p className="text-foreground">
              Disable access for <strong>{userToToggleStatus?.name}</strong>?
            </p>
            <p className="text-sm text-muted-foreground mt-1">{userToToggleStatus?.email}</p>
          </div>
        </div>
      </Modal>

      {/* User Limit Reached Modal */}
      <Modal
        isOpen={showUserLimitModal}
        onClose={() => {
          setShowUserLimitModal(false);
          setUserToToggleStatus(null);
        }}
        title="User Limit Reached"
        footer={
          <>
            <Button
              variant="outline"
              onClick={() => {
                setShowUserLimitModal(false);
                setUserToToggleStatus(null);
              }}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={() => {
                setShowUserLimitModal(false);
                setUserToToggleStatus(null);
                navigate("/settings", { state: { activeTab: "plans-subscription" } });
              }}
            >
              Increase User Limit
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <div className="flex gap-3">
            <AlertCircle className="w-6 h-6 text-warning flex-shrink-0" />
            <div>
              <p className="font-medium">Your plan supports {planUserLimit} active users.</p>
              <p className="text-sm text-muted-foreground mt-2">
                To activate <strong>{userToToggleStatus?.name}</strong>, you'll need to increase your user limit by upgrading your plan or adding more user seats.
              </p>
            </div>
          </div>
        </div>
      </Modal>
    </div>
  );
}

interface PermissionRowProps {
  icon: React.ReactNode;
  label: string;
  module: keyof Permissions;
  currentLevel: PermissionLevel;
  onChange: (module: keyof Permissions, level: PermissionLevel) => void;
}

function PermissionRow({ icon, label, module, currentLevel, onChange }: PermissionRowProps) {
  const levels: { value: PermissionLevel; label: string }[] = [
    { value: "none", label: "No Access" },
    { value: "read", label: "Read" },
    { value: "write", label: "Write" },
    { value: "full", label: "Full Access" },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-[35%_65%] gap-4 p-4 bg-muted/50 rounded-lg hover:bg-muted transition-colors min-h-[64px] items-center">
      <div className="flex items-center gap-3">
        <div className="text-muted-foreground flex-shrink-0">{icon}</div>
        <p className="font-medium text-sm">{label}</p>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
        {levels.map((level) => (
          <label
            key={level.value}
            className={`flex items-center justify-center gap-2 cursor-pointer px-4 py-2.5 rounded-md transition-all text-xs font-medium ${
              currentLevel === level.value
                ? "bg-primary text-primary-foreground shadow-sm"
                : "bg-card text-muted-foreground hover:bg-muted-foreground/10 border border-border"
            }`}
          >
            <input
              type="radio"
              name={`permission-${module}`}
              value={level.value}
              checked={currentLevel === level.value}
              onChange={() => onChange(module, level.value)}
              className="sr-only"
            />
            <div className={`w-3 h-3 rounded-full border-2 flex items-center justify-center ${
              currentLevel === level.value
                ? "border-primary-foreground"
                : "border-muted-foreground"
            }`}>
              {currentLevel === level.value && (
                <div className="w-1.5 h-1.5 rounded-full bg-primary-foreground"></div>
              )}
            </div>
            <span className="whitespace-nowrap">{level.label}</span>
          </label>
        ))}
      </div>
    </div>
  );
}
