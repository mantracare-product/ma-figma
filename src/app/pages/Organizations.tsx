import { useState, useMemo } from "react";
import {
  Plus,
  Edit,
  Trash2,
  Users,
  Search,
  Coins,
  Settings as SettingsIcon,
  ChevronRight,
  ChevronLeft,
  ChevronsLeft,
  ChevronsRight,
  GripVertical,
  Building2,
  Check,
  ExternalLink,
  MoreVertical,
} from "lucide-react";
import { Button } from "../components/ui/Button";
import { Input } from "../components/ui/Input";
import { Modal } from "../components/ui/Modal";
import { Tooltip } from "../components/ui/Tooltip";
import { toast } from "sonner";
import { useNavigate } from "react-router";
import PageHeader from "../components/layout/PageHeader";
import PageTopBar from "../components/layout/PageTopBar";
import { TableComponent, TableColumn, TableRowAction } from "../components/ui/TableComponent";
import SettingsSubnav from "../components/settings/SettingsSubnav";
import OrganizationDetailDrawer, { OrganizationDetail } from "../components/settings/OrganizationDetailDrawer";
import { useOrganization } from "../context/OrganizationContext";
import {
  INITIAL_CATEGORIES,
  STANDARD_LOCATIONS,
  getIndustriesForCategory,
} from "../../data/industryReferenceData";

interface OrganizationItem {
  id: string;
  name: string;
  flag?: string;
  email: string;
  industryCategory?: string;
  industry: string;
  location?: string;
  locations?: string[];
  preferredTime: string;
  status: "Active" | "Inactive";
  users: number;
  createdDate: string;
  totalCredits?: number;
  assignedCredits?: number;
  creditsLeft?: number;
}

const initialOrgs: OrganizationItem[] = [
  {
    id: "1",
    name: "Demo Mantra",
    flag: "🇮🇳",
    email: "ayemantrauser012@gmail.com",
    industryCategory: "Healthcare",
    industry: "General Physician",
    location: "California",
    locations: ["California"],
    preferredTime: "2:00 PM - IST",
    status: "Active",
    users: 1,
    createdDate: "Jul 06, 10:56 AM",
    totalCredits: 0,
    assignedCredits: 0,
    creditsLeft: 0,
  },
  {
    id: "2",
    name: "Healthcare Care Org",
    flag: "🇺🇸",
    email: "contact@healthcareorg.com",
    industryCategory: "Healthcare",
    industry: "Cardiologist",
    location: "New York",
    locations: ["New York"],
    preferredTime: "10:00 AM - EST",
    status: "Active",
    users: 12,
    createdDate: "Jun 15, 09:30 AM",
    totalCredits: 500,
    assignedCredits: 350,
    creditsLeft: 150,
  },
  {
    id: "3",
    name: "Dental Care Center",
    flag: "🇬🇧",
    email: "admin@dentalcare.co.uk",
    industryCategory: "Healthcare",
    industry: "Dentist",
    location: "Texas",
    locations: ["Texas"],
    preferredTime: "3:30 PM - GMT",
    status: "Active",
    users: 5,
    createdDate: "May 20, 02:15 PM",
    totalCredits: 200,
    assignedCredits: 120,
    creditsLeft: 80,
  },
];

export default function Organizations() {
  const navigate = useNavigate();
  const { setActiveOrganization, addOrganization, updateOrganization } = useOrganization();

  const [organizations, setOrganizations] = useState<OrganizationItem[]>(initialOrgs);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedOrgs, setSelectedOrgs] = useState<string[]>([]);
  const [selectedOrgSet, setSelectedOrgSet] = useState<Set<any>>(new Set());
  const [showAddModal, setShowAddModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingOrg, setEditingOrg] = useState<OrganizationItem | null>(null);
  const [deletingOrg, setDeletingOrg] = useState<OrganizationItem | null>(null);

  const [selectedOrgForDrawer, setSelectedOrgForDrawer] = useState<OrganizationDetail | null>(null);
  const [showOrgDrawer, setShowOrgDrawer] = useState(false);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(20);

  // New Organization Form
  const [newOrg, setNewOrg] = useState({
    name: "",
    email: "",
    industryCategory: "Healthcare",
    industry: "General Physician",
    location: "California",
    flag: "🇺🇸",
    preferredTime: "2:00 PM - IST",
  });

  // KPI calculations
  const totalCreditsSum = useMemo(() => {
    return organizations.reduce((acc, org) => acc + (org.totalCredits || 0), 0);
  }, [organizations]);

  const assignedCreditsSum = useMemo(() => {
    return organizations.reduce((acc, org) => acc + (org.assignedCredits || 0), 0);
  }, [organizations]);

  const creditsLeftSum = useMemo(() => {
    return organizations.reduce((acc, org) => acc + (org.creditsLeft || 0), 0);
  }, [organizations]);

  // Filtered organizations
  const filteredOrgs = useMemo(() => {
    return organizations.filter((org) => {
      const matchSearch =
        org.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        org.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
        org.industry.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (org.industryCategory && org.industryCategory.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (org.location && org.location.toLowerCase().includes(searchQuery.toLowerCase()));
      return matchSearch;
    });
  }, [organizations, searchQuery]);

  // Paginated organizations
  const totalPages = Math.ceil(filteredOrgs.length / rowsPerPage) || 1;
  const paginatedOrgs = useMemo(() => {
    const start = (currentPage - 1) * rowsPerPage;
    return filteredOrgs.slice(start, start + rowsPerPage);
  }, [filteredOrgs, currentPage, rowsPerPage]);

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedOrgs(paginatedOrgs.map((o) => o.id));
    } else {
      setSelectedOrgs([]);
    }
  };

  const handleSelectOne = (id: string) => {
    setSelectedOrgs((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleAddOrg = () => {
    if (!newOrg.name || !newOrg.email || !newOrg.industry) {
      toast.error("Please fill all required fields");
      return;
    }

    const org: OrganizationItem = {
      id: String(Date.now()),
      name: newOrg.name,
      flag: newOrg.flag,
      email: newOrg.email,
      industryCategory: newOrg.industryCategory,
      industry: newOrg.industry,
      location: newOrg.location,
      locations: newOrg.location ? [newOrg.location] : [],
      preferredTime: newOrg.preferredTime,
      status: "Active",
      users: 1,
      createdDate: new Date().toLocaleDateString("en-US", {
        month: "short",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
      }),
      totalCredits: 0,
      assignedCredits: 0,
      creditsLeft: 0,
    };

    setOrganizations([org, ...organizations]);
    addOrganization({
      name: org.name,
      email: org.email,
      phone: "+1 (555) 000-0000",
      industryCategory: org.industryCategory,
      industry: org.industry,
      location: org.location,
      locations: org.locations,
      status: org.status,
    });
    setNewOrg({
      name: "",
      email: "",
      industryCategory: "Healthcare",
      industry: "General Physician",
      location: "California",
      flag: "🇺🇸",
      preferredTime: "2:00 PM - IST",
    });
    setShowAddModal(false);
    toast.success("Organization created successfully");
  };

  const handleSaveEditOrg = () => {
    if (!editingOrg || !editingOrg.name || !editingOrg.email) {
      toast.error("Please fill all required fields");
      return;
    }

    setOrganizations(
      organizations.map((o) => (o.id === editingOrg.id ? editingOrg : o))
    );
    updateOrganization(editingOrg.id, {
      name: editingOrg.name,
      email: editingOrg.email,
      industryCategory: editingOrg.industryCategory,
      industry: editingOrg.industry,
      location: editingOrg.location,
      locations: editingOrg.location ? [editingOrg.location] : (editingOrg.locations || []),
      status: editingOrg.status,
    });
    setShowEditModal(false);
    setEditingOrg(null);
    toast.success("Organization updated successfully");
  };

  const confirmDeleteOrg = () => {
    if (deletingOrg) {
      setOrganizations(organizations.filter((o) => o.id !== deletingOrg.id));
      setSelectedOrgs((prev) => prev.filter((id) => id !== deletingOrg.id));
      toast.success("Organization deleted");
      setShowDeleteModal(false);
      setDeletingOrg(null);
    }
  };

  const handleRowClick = (org: OrganizationItem) => {
    setActiveOrganization({
      id: org.id,
      name: org.name,
      industryCategory: org.industryCategory,
      industry: org.industry,
      location: org.location,
      locations: org.locations || (org.location ? [org.location] : []),
      email: org.email,
      phone: "+1 (555) 000-0000",
      status: org.status,
    });
  };

  return (
    <div className="min-h-screen bg-[#fafafa] p-3 sm:p-4">
      <div className="max-w-[1440px] mx-auto flex gap-4 items-start">
        {/* Left Submenu Navigation */}
        <SettingsSubnav activeId="organizations" />

        {/* Main Content Area */}
        <div className="flex-1 min-w-0 space-y-2.5">
          {/* Header */}
          <div className="space-y-0.5">
            <h1
              className="text-xl sm:text-2xl font-bold text-[#222222] tracking-tight"
              style={{ fontFamily: "Outfit, sans-serif" }}
            >
              Organizations
            </h1>
            <p className="text-xs text-[#64748b] font-normal leading-tight">
              Manage your organization hierarchy and system settings with precision
            </p>
          </div>

          {/* 3 Stat Cards Grid */}
          {/* 3 Stat Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5">
            {/* Total Credits */}
            <div className="bg-white/80 backdrop-blur-xl rounded-xl border border-white/80 shadow-2xs p-3 flex items-center justify-between transition-all">
              <div>
                <p className="text-[11px] font-semibold text-[#64748b] tracking-wide">
                  Total Credits
                </p>
                <p
                  className="text-xl font-bold text-[#222222] mt-0.5 tracking-tight"
                  style={{ fontFamily: "Outfit, sans-serif" }}
                >
                  {totalCreditsSum}
                </p>
              </div>
              <div className="w-8 h-8 rounded-lg bg-blue-50/80 border border-blue-100 flex items-center justify-center text-[#1456f0]">
                <Coins className="w-4 h-4" />
              </div>
            </div>

            {/* Assigned Credits */}
            <div className="bg-white/80 backdrop-blur-xl rounded-xl border border-white/80 shadow-2xs p-3 flex items-center justify-between transition-all">
              <div>
                <p className="text-[11px] font-semibold text-[#64748b] tracking-wide">
                  Assigned Credits
                </p>
                <p
                  className="text-xl font-bold text-[#222222] mt-0.5 tracking-tight"
                  style={{ fontFamily: "Outfit, sans-serif" }}
                >
                  {assignedCreditsSum}
                </p>
              </div>
              <div className="w-8 h-8 rounded-lg bg-amber-50/80 border border-amber-100 flex items-center justify-center text-[#f59e0b]">
                <Coins className="w-4 h-4" />
              </div>
            </div>

            {/* Credits Left */}
            <div className="bg-white/80 backdrop-blur-xl rounded-xl border border-white/80 shadow-2xs p-3 flex items-center justify-between transition-all">
              <div>
                <p className="text-[11px] font-semibold text-[#64748b] tracking-wide">
                  Credits Left
                </p>
                <p
                  className="text-xl font-bold text-[#222222] mt-0.5 tracking-tight"
                  style={{ fontFamily: "Outfit, sans-serif" }}
                >
                  {creditsLeftSum}
                </p>
              </div>
              <div className="w-8 h-8 rounded-lg bg-emerald-50/80 border border-emerald-100 flex items-center justify-center text-[#10b981]">
                <Coins className="w-4 h-4" />
              </div>
            </div>
          </div>

          {/* Search & Actions Toolbar powered by PageTopBar */}
          <PageTopBar
            isBottomPanelAttached={true}
            searchQuery={searchQuery}
            onSearchChange={(v) => {
              setSearchQuery(v);
              setCurrentPage(1);
            }}
            searchPlaceholder="Search organizations..."
            primaryAction={{
              label: "Add Organization",
              icon: <Plus className="w-4 h-4" />,
              onClick: () => setShowAddModal(true),
            }}
          />

          {/* Table Container using TableComponent */}
          {(() => {
            const orgColumns: TableColumn<OrganizationItem>[] = [
              {
                id: "name",
                header: "Organization Name",
                align: "left",
                render: (org) => (
                  <span
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedOrgForDrawer({
                        ...org,
                        phone: "+1 (555) 000-0000",
                        industryCategory: org.industryCategory || "Healthcare",
                      });
                      setShowOrgDrawer(true);
                    }}
                    className="inline-flex items-center gap-1.5 text-[#1456f0] hover:underline cursor-pointer font-semibold"
                  >
                    {org.flag && <span className="text-sm">{org.flag}</span>}
                    <span>{org.name}</span>
                  </span>
                ),
              },
              {
                id: "email",
                header: "Email",
                align: "left",
                render: (org) => <span className="text-[#45515e]">{org.email}</span>,
              },
              {
                id: "industry",
                header: "Industry",
                align: "left",
                render: (org) => (
                  <div className="flex items-center justify-start gap-1.5">
                    <span className="font-semibold text-[#222222]">{org.industry}</span>
                    {org.industryCategory && (
                      <span className="text-[10px] text-[#64748b]">({org.industryCategory})</span>
                    )}
                  </div>
                ),
              },
              {
                id: "location",
                header: "Location",
                align: "left",
                render: (org) => (
                  <span className="text-[#45515e]">
                    {org.location || (org.locations && org.locations.length > 0 ? org.locations.join(", ") : "—")}
                  </span>
                ),
              },
              {
                id: "preferredTime",
                header: "Preferred Time",
                align: "left",
                render: (org) => <span className="text-[#45515e]">{org.preferredTime}</span>,
              },
              {
                id: "status",
                header: "Status",
                align: "center",
                render: (org) => (
                  <span
                    className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-none text-[11px] font-semibold ${
                      org.status === "Active"
                        ? "bg-emerald-50 text-[#10b981] border border-emerald-200/60"
                        : "bg-slate-100 text-slate-500 border border-slate-200"
                    }`}
                  >
                    <span
                      className={`w-1 h-1 rounded-full ${
                        org.status === "Active" ? "bg-[#10b981]" : "bg-slate-400"
                      }`}
                    />
                    {org.status}
                  </span>
                ),
              },
              {
                id: "users",
                header: "Users",
                align: "center",
                render: (org) => <span className="text-[#45515e]">{org.users} Users</span>,
              },
              {
                id: "createdDate",
                header: "Created On",
                align: "left",
                render: (org) => <span className="text-[#64748b] text-[11px]">{org.createdDate}</span>,
              },
            ];

            const orgRowActions: TableRowAction<OrganizationItem>[] = [
              {
                label: "Edit",
                icon: <Edit className="w-3.5 h-3.5" />,
                onClick: (org) => {
                  setEditingOrg(org);
                  setShowEditModal(true);
                },
              },
              {
                label: "Delete",
                icon: <Trash2 className="w-3.5 h-3.5" />,
                isDanger: true,
                onClick: (org) => {
                  setDeletingOrg(org);
                  setShowDeleteModal(true);
                },
              },
            ];

            return (
              <TableComponent
                data={filteredOrgs}
                columns={orgColumns}
                getRowId={(org) => org.id}
                rowActions={orgRowActions}
                selectedIds={selectedOrgSet}
                onSelectionChange={setSelectedOrgSet}
                defaultRowsPerPage={20}
                emptyMessage="No organizations found matching your search."
                onRowClick={(org) => handleRowClick(org)}
              />
            );
          })()}
        </div>
      </div>

      {/* Add Organization Modal */}
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
            placeholder="e.g. Demo Mantra Healthcare"
          />

          <Input
            label="Email"
            type="email"
            value={newOrg.email}
            onChange={(e) => setNewOrg({ ...newOrg, email: e.target.value })}
            placeholder="admin@organization.com"
          />

          {/* Industry Category & Industry */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                Industry Category
              </label>
              <select
                value={newOrg.industryCategory}
                onChange={(e) => {
                  const cat = e.target.value;
                  const indList = getIndustriesForCategory(cat);
                  setNewOrg({
                    ...newOrg,
                    industryCategory: cat,
                    industry: indList[0] || "",
                  });
                }}
                className="w-full px-3 py-2 bg-white/90 border border-slate-200 rounded-xl text-xs text-[#222222] focus:outline-none focus:ring-2 focus:ring-[#1456f0]/20"
              >
                {INITIAL_CATEGORIES.map((c) => (
                  <option key={c.id} value={c.name}>{c.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                Industry
              </label>
              <select
                value={newOrg.industry}
                onChange={(e) => setNewOrg({ ...newOrg, industry: e.target.value })}
                className="w-full px-3 py-2 bg-white/90 border border-slate-200 rounded-xl text-xs text-[#222222] focus:outline-none focus:ring-2 focus:ring-[#1456f0]/20"
              >
                {getIndustriesForCategory(newOrg.industryCategory).map((ind) => (
                  <option key={ind} value={ind}>{ind}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Country Flag & Location */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                Country Flag
              </label>
              <select
                value={newOrg.flag}
                onChange={(e) => setNewOrg({ ...newOrg, flag: e.target.value })}
                className="w-full px-3 py-2 bg-white/90 border border-slate-200 rounded-xl text-xs text-[#222222] focus:outline-none focus:ring-2 focus:ring-[#1456f0]/20"
              >
                <option value="🇮🇳">🇮🇳 India</option>
                <option value="🇺🇸">🇺🇸 United States</option>
                <option value="🇬🇧">🇬🇧 United Kingdom</option>
                <option value="🇦🇺">🇦🇺 Australia</option>
                <option value="🇨🇦">🇨🇦 Canada</option>
                <option value="🇦🇪">🇦🇪 UAE</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                Location
              </label>
              <select
                value={newOrg.location}
                onChange={(e) => setNewOrg({ ...newOrg, location: e.target.value })}
                className="w-full px-3 py-2 bg-white/90 border border-slate-200 rounded-xl text-xs text-[#222222] focus:outline-none focus:ring-2 focus:ring-[#1456f0]/20"
              >
                {STANDARD_LOCATIONS.map((loc) => (
                  <option key={loc} value={loc}>{loc}</option>
                ))}
              </select>
            </div>
          </div>

          <Input
            label="Preferred Calling Time"
            value={newOrg.preferredTime}
            onChange={(e) => setNewOrg({ ...newOrg, preferredTime: e.target.value })}
            placeholder="2:00 PM - IST"
          />
        </div>
      </Modal>

      {/* Edit Organization Modal */}
      <Modal
        isOpen={showEditModal}
        onClose={() => {
          setShowEditModal(false);
          setEditingOrg(null);
        }}
        title="Edit Organization"
        footer={
          <>
            <Button
              variant="outline"
              onClick={() => {
                setShowEditModal(false);
                setEditingOrg(null);
              }}
            >
              Cancel
            </Button>
            <Button variant="primary" onClick={handleSaveEditOrg}>
              Save Changes
            </Button>
          </>
        }
      >
        {editingOrg && (
          <div className="space-y-4">
            <Input
              label="Organization Name"
              value={editingOrg.name}
              onChange={(e) => setEditingOrg({ ...editingOrg, name: e.target.value })}
            />

            <Input
              label="Email"
              type="email"
              value={editingOrg.email}
              onChange={(e) => setEditingOrg({ ...editingOrg, email: e.target.value })}
            />

            {/* Industry Category & Industry */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                  Industry Category
                </label>
                <select
                  value={editingOrg.industryCategory || "Healthcare"}
                  onChange={(e) => {
                    const cat = e.target.value;
                    const indList = getIndustriesForCategory(cat);
                    setEditingOrg({
                      ...editingOrg,
                      industryCategory: cat,
                      industry: indList[0] || "",
                    });
                  }}
                  className="w-full px-3 py-2 bg-white/90 border border-slate-200 rounded-xl text-xs text-[#222222] focus:outline-none focus:ring-2 focus:ring-[#1456f0]/20"
                >
                  {INITIAL_CATEGORIES.map((c) => (
                    <option key={c.id} value={c.name}>{c.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                  Industry
                </label>
                <select
                  value={editingOrg.industry}
                  onChange={(e) => setEditingOrg({ ...editingOrg, industry: e.target.value })}
                  className="w-full px-3 py-2 bg-white/90 border border-slate-200 rounded-xl text-xs text-[#222222] focus:outline-none focus:ring-2 focus:ring-[#1456f0]/20"
                >
                  {getIndustriesForCategory(editingOrg.industryCategory || "Healthcare").map((ind) => (
                    <option key={ind} value={ind}>{ind}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Location & Status */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                  Location
                </label>
                <select
                  value={editingOrg.location || editingOrg.locations?.[0] || "California"}
                  onChange={(e) => {
                    const loc = e.target.value;
                    setEditingOrg({
                      ...editingOrg,
                      location: loc,
                      locations: [loc],
                    });
                  }}
                  className="w-full px-3 py-2 bg-white/90 border border-slate-200 rounded-xl text-xs text-[#222222] focus:outline-none focus:ring-2 focus:ring-[#1456f0]/20"
                >
                  {STANDARD_LOCATIONS.map((loc) => (
                    <option key={loc} value={loc}>{loc}</option>
                  ))}
                  {editingOrg.location && !STANDARD_LOCATIONS.includes(editingOrg.location) && (
                    <option value={editingOrg.location}>{editingOrg.location}</option>
                  )}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                  Status
                </label>
                <select
                  value={editingOrg.status}
                  onChange={(e) =>
                    setEditingOrg({
                      ...editingOrg,
                      status: e.target.value as "Active" | "Inactive",
                    })
                  }
                  className="w-full px-3 py-2 bg-white/90 border border-slate-200 rounded-xl text-xs text-[#222222] focus:outline-none focus:ring-2 focus:ring-[#1456f0]/20"
                >
                  <option value="Active">Active</option>
                  <option value="Inactive">Inactive</option>
                </select>
              </div>
            </div>

            <Input
              label="Preferred Calling Time"
              value={editingOrg.preferredTime}
              onChange={(e) =>
                setEditingOrg({ ...editingOrg, preferredTime: e.target.value })
              }
            />
          </div>
        )}
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
            <Button
              variant="outline"
              onClick={() => {
                setShowDeleteModal(false);
                setDeletingOrg(null);
              }}
            >
              Cancel
            </Button>
            <Button variant="destructive" onClick={confirmDeleteOrg}>
              Delete
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <p className="text-foreground text-sm">
            Are you sure you want to delete{" "}
            <span className="font-bold text-[#222222]">{deletingOrg?.name}</span>?
          </p>
          <p className="text-xs text-[#64748b]">
            This action cannot be undone. All data and member associations will be permanently removed.
          </p>
        </div>
      </Modal>

      {/* Organization Detail Drawer */}
      <OrganizationDetailDrawer
        isOpen={showOrgDrawer}
        onClose={() => setShowOrgDrawer(false)}
        organization={selectedOrgForDrawer}
        onSave={(updated) => {
          setOrganizations((prev) =>
            prev.map((o) => (o.id === updated.id ? { ...o, ...updated } : o))
          );
          updateOrganization(updated.id, {
            name: updated.name,
            email: updated.email,
            phone: updated.phone,
            industryCategory: updated.industryCategory,
            industry: updated.industry,
            location: updated.location,
            locations: updated.locations,
            status: updated.status,
          });
        }}
      />
    </div>
  );
}
