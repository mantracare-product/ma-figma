import { useState } from "react";
import { Plus, Edit, Trash2, Users } from "lucide-react";
import { Button } from "../components/ui/Button";
import { Input } from "../components/ui/Input";
import { Modal } from "../components/ui/Modal";
import { Tooltip } from "../components/ui/Tooltip";
import { toast } from "sonner";
import { useNavigate } from "react-router";
import PageHeader from "../components/layout/PageHeader";

interface Organization {
  id: string;
  name: string;
  industry: string;
  status: string;
  users: number;
  createdDate: string;
}

const initialOrgs: Organization[] = [
  { id: "1", name: "Healthcare Org", industry: "Healthcare", status: "Active", users: 12, createdDate: "2024-01-15" },
  { id: "2", name: "Demo Organization", industry: "Technology", status: "Active", users: 5, createdDate: "2024-02-20" },
  { id: "3", name: "Test Clinic", industry: "Healthcare", status: "Inactive", users: 3, createdDate: "2024-03-10" },
];

export default function Organizations() {
  const navigate = useNavigate();
  const [organizations, setOrganizations] = useState<Organization[]>(initialOrgs);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [newOrg, setNewOrg] = useState({ name: "", industry: "" });
  const [deletingOrg, setDeletingOrg] = useState<Organization | null>(null);

  const handleAddOrg = () => {
    if (!newOrg.name || !newOrg.industry) {
      toast.error("Please fill all fields");
      return;
    }

    const org: Organization = {
      id: String(organizations.length + 1),
      ...newOrg,
      status: "Active",
      users: 0,
      createdDate: new Date().toISOString().split("T")[0],
    };

    setOrganizations([org, ...organizations]);
    setNewOrg({ name: "", industry: "" });
    setShowAddModal(false);
    toast.success("Organization added successfully");
  };

  const handleEditOrg = (org: Organization) => {
    // Navigate to Settings > Organization with the selected organization data
    navigate("/settings", {
      state: {
        activeTab: "organization",
        editingOrganization: org,
      },
    });
  };

  const confirmDeleteOrg = () => {
    if (deletingOrg) {
      setOrganizations(organizations.filter((o) => o.id !== deletingOrg.id));
      toast.success("Organization deleted");
      setShowDeleteModal(false);
      setDeletingOrg(null);
    }
  };

  return (
    <div className="p-6 space-y-6">
      <PageHeader
        title="Organizations"
        subtitle="Manage your organizations"
      >
        <Button variant="primary" onClick={() => setShowAddModal(true)}>
          <Plus className="w-4 h-4" />
          Add Organization
        </Button>
      </PageHeader>

      <div className="bg-card rounded-xl border border-border shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-muted border-b border-border">
              <tr>
                <th className="px-6 py-4 text-left text-sm font-semibold">Name</th>
                <th className="px-6 py-4 text-left text-sm font-semibold">Industry</th>
                <th className="px-6 py-4 text-left text-sm font-semibold">Status</th>
                <th className="px-6 py-4 text-left text-sm font-semibold">Users</th>
                <th className="px-6 py-4 text-left text-sm font-semibold">Created Date</th>
                <th className="px-6 py-4 text-left text-sm font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {organizations.map((org) => (
                <tr key={org.id} className="hover:bg-muted transition-colors">
                  <td className="px-6 py-4 font-medium">{org.name}</td>
                  <td className="px-6 py-4">{org.industry}</td>
                  <td className="px-6 py-4">
                    <span
                      className={`px-3 py-1 rounded-full text-sm font-medium ${
                        org.status === "Active"
                          ? "bg-success-bg text-success"
                          : "bg-muted text-muted-foreground"
                      }`}
                    >
                      {org.status}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <Users className="w-4 h-4 text-muted-foreground" />
                      <span>{org.users}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-muted-foreground">{org.createdDate}</td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <Tooltip text="Edit">
                        <button
                          onClick={() => handleEditOrg(org)}
                          className="p-2 hover:bg-muted rounded-lg transition-colors"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                      </Tooltip>
                      <Tooltip text="Delete">
                        <button
                          onClick={() => {
                            setDeletingOrg(org);
                            setShowDeleteModal(true);
                          }}
                          className="p-2 hover:bg-muted rounded-lg transition-colors text-destructive"
                        >
                          <Trash2 className="w-4 h-4" />
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
        title="Add New Organization"
        footer={
          <>
            <Button variant="outline" onClick={() => setShowAddModal(false)}>
              Cancel
            </Button>
            <Button variant="primary" onClick={handleAddOrg}>
              Add Organization
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <Input
            label="Organization Name"
            value={newOrg.name}
            onChange={(e) => setNewOrg({ ...newOrg, name: e.target.value })}
            placeholder="Enter organization name"
          />
          <div>
            <label className="block text-sm font-medium mb-2">Industry</label>
            <select
              value={newOrg.industry}
              onChange={(e) => setNewOrg({ ...newOrg, industry: e.target.value })}
              className="w-full px-4 py-2 bg-input-background border border-input rounded-xl"
            >
              <option value="">Select industry</option>
              <option value="Healthcare">Healthcare</option>
              <option value="Technology">Technology</option>
              <option value="Finance">Finance</option>
              <option value="Education">Education</option>
              <option value="Retail">Retail</option>
            </select>
          </div>
        </div>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={showDeleteModal}
        onClose={() => {
          setShowDeleteModal(false);
          setDeletingOrg(null);
        }}
        title="Delete Organization"
        footer={
          <>
            <Button variant="outline" onClick={() => {
              setShowDeleteModal(false);
              setDeletingOrg(null);
            }}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={confirmDeleteOrg}>
              Delete
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <p className="text-foreground">
            Are you sure you want to delete <span className="font-semibold">{deletingOrg?.name}</span>?
          </p>
          <p className="text-sm text-muted-foreground">
            This action cannot be undone. All data associated with this organization will be permanently removed.
          </p>
        </div>
      </Modal>
    </div>
  );
}
