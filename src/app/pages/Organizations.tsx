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
import SettingsSubnav from "../components/settings/SettingsSubnav";
import { useOrganization } from "../context/OrganizationContext";

interface OrganizationItem {
  id: string;
  name: string;
  flag?: string;
  email: string;
  industry: string;
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
    industry: "De Addiction Expert",
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
    industry: "Healthcare",
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
    industry: "Dental",
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
  const { setActiveOrganization } = useOrganization();

  const [organizations, setOrganizations] = useState<OrganizationItem[]>(initialOrgs);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedOrgs, setSelectedOrgs] = useState<string[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingOrg, setEditingOrg] = useState<OrganizationItem | null>(null);
  const [deletingOrg, setDeletingOrg] = useState<OrganizationItem | null>(null);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(15);

  // New Organization Form
  const [newOrg, setNewOrg] = useState({
    name: "",
    email: "",
    industry: "Healthcare",
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
        org.industry.toLowerCase().includes(searchQuery.toLowerCase());
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
      industry: newOrg.industry,
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
    setNewOrg({
      name: "",
      email: "",
      industry: "Healthcare",
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
      industry: org.industry,
      email: org.email,
      phone: "+1 (555) 000-0000",
      status: org.status,
    });
  };

  return (
    <div className="min-h-screen bg-[#fafafa] p-6 lg:p-8">
      <div className="max-w-[1440px] mx-auto flex gap-6 items-start">
        {/* Left Submenu Navigation */}
        <SettingsSubnav activeId="organizations" />

        {/* Main Content Area */}
        <div className="flex-1 min-w-0 space-y-6">
          {/* Header */}
          <div className="space-y-1">
            <h1
              className="text-3xl font-bold text-[#222222] tracking-tight"
              style={{ fontFamily: "Outfit, sans-serif" }}
            >
              Organizations
            </h1>
            <p className="text-sm text-[#64748b] font-normal leading-relaxed">
              Manage your organization hierarchy and system settings with precision
            </p>
          </div>

          {/* 3 Stat Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Total Credits */}
            <div className="bg-white/80 backdrop-blur-xl rounded-[24px] border border-white/80 shadow-[0_2px_16px_rgba(0,0,0,0.02)] p-5 flex items-center justify-between transition-all hover:shadow-[0_4px_20px_rgba(0,0,0,0.04)]">
              <div>
                <p className="text-xs font-semibold text-[#64748b] tracking-wide">
                  Total Credits
                </p>
                <p
                  className="text-3xl font-bold text-[#222222] mt-1 tracking-tight"
                  style={{ fontFamily: "Outfit, sans-serif" }}
                >
                  {totalCreditsSum}
                </p>
              </div>
              <div className="w-12 h-12 rounded-2xl bg-blue-50/80 border border-blue-100 flex items-center justify-center text-[#1456f0] shadow-2xs">
                <Coins className="w-6 h-6" />
              </div>
            </div>

            {/* Assigned Credits */}
            <div className="bg-white/80 backdrop-blur-xl rounded-[24px] border border-white/80 shadow-[0_2px_16px_rgba(0,0,0,0.02)] p-5 flex items-center justify-between transition-all hover:shadow-[0_4px_20px_rgba(0,0,0,0.04)]">
              <div>
                <p className="text-xs font-semibold text-[#64748b] tracking-wide">
                  Assigned Credits
                </p>
                <p
                  className="text-3xl font-bold text-[#222222] mt-1 tracking-tight"
                  style={{ fontFamily: "Outfit, sans-serif" }}
                >
                  {assignedCreditsSum}
                </p>
              </div>
              <div className="w-12 h-12 rounded-2xl bg-amber-50/80 border border-amber-100 flex items-center justify-center text-[#f59e0b] shadow-2xs">
                <Coins className="w-6 h-6" />
              </div>
            </div>

            {/* Credits Left */}
            <div className="bg-white/80 backdrop-blur-xl rounded-[24px] border border-white/80 shadow-[0_2px_16px_rgba(0,0,0,0.02)] p-5 flex items-center justify-between transition-all hover:shadow-[0_4px_20px_rgba(0,0,0,0.04)]">
              <div>
                <p className="text-xs font-semibold text-[#64748b] tracking-wide">
                  Credits Left
                </p>
                <p
                  className="text-3xl font-bold text-[#222222] mt-1 tracking-tight"
                  style={{ fontFamily: "Outfit, sans-serif" }}
                >
                  {creditsLeftSum}
                </p>
              </div>
              <div className="w-12 h-12 rounded-2xl bg-emerald-50/80 border border-emerald-100 flex items-center justify-center text-[#10b981] shadow-2xs">
                <Coins className="w-6 h-6" />
              </div>
            </div>
          </div>

          {/* Search & Actions Toolbar */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-2">
            <div className="flex items-center gap-3 w-full sm:w-auto">
              <button
                type="button"
                className="px-4 py-2 rounded-full text-xs font-semibold bg-blue-50 text-[#1456f0] border border-blue-200/60 shadow-2xs hover:bg-blue-100/60 transition-all cursor-pointer"
              >
                All Organizations
              </button>

              <div className="relative flex-1 sm:w-64">
                <Search className="w-3.5 h-3.5 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search..."
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="w-full pl-9 pr-4 py-1.5 text-xs bg-white/80 border border-slate-200/80 rounded-full text-[#222222] placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#1456f0]/20 focus:border-[#1456f0] transition-all"
                />
              </div>
            </div>

            <div className="flex items-center gap-4 self-end sm:self-auto">
              <span className="text-xs font-medium text-[#64748b]">
                {filteredOrgs.length} {filteredOrgs.length === 1 ? "organization" : "organizations"}
              </span>

              {/* Circular Dark Plus Button */}
              <button
                type="button"
                onClick={() => setShowAddModal(true)}
                className="w-9 h-9 rounded-full bg-gradient-to-r from-[#181e25] to-[#2c3e50] text-white flex items-center justify-center shadow-sm hover:shadow-md hover:scale-105 active:scale-95 transition-all cursor-pointer"
                title="Add Organization"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Table Container */}
          <div className="bg-white/80 backdrop-blur-xl rounded-[20px] border border-slate-200/80 shadow-2xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                {/* Dark Table Header */}
                <thead>
                  <tr className="bg-gradient-to-r from-[#181e25] to-[#2c3e50] text-white text-left">
                    <th className="w-10 px-4 py-3.5 text-center">
                      <input
                        type="checkbox"
                        checked={
                          paginatedOrgs.length > 0 &&
                          selectedOrgs.length === paginatedOrgs.length
                        }
                        onChange={(e) => handleSelectAll(e.target.checked)}
                        className="w-3.5 h-3.5 rounded border-slate-400 accent-[#1456f0] cursor-pointer"
                      />
                    </th>
                    <th className="w-8 px-2 py-3.5 text-center">
                      <SettingsIcon className="w-3.5 h-3.5 text-slate-400 hover:text-white transition-colors cursor-pointer mx-auto" />
                    </th>
                    <th
                      className="px-4 py-3.5 text-[11px] font-bold uppercase tracking-wider whitespace-nowrap"
                      style={{ fontFamily: "Outfit, sans-serif" }}
                    >
                      ORGANIZATION NAME
                    </th>
                    <th
                      className="px-4 py-3.5 text-[11px] font-bold uppercase tracking-wider whitespace-nowrap"
                      style={{ fontFamily: "Outfit, sans-serif" }}
                    >
                      EMAIL
                    </th>
                    <th
                      className="px-4 py-3.5 text-[11px] font-bold uppercase tracking-wider whitespace-nowrap"
                      style={{ fontFamily: "Outfit, sans-serif" }}
                    >
                      INDUSTRY
                    </th>
                    <th
                      className="px-4 py-3.5 text-[11px] font-bold uppercase tracking-wider whitespace-nowrap"
                      style={{ fontFamily: "Outfit, sans-serif" }}
                    >
                      PREFERRED TIME
                    </th>
                    <th
                      className="px-4 py-3.5 text-[11px] font-bold uppercase tracking-wider whitespace-nowrap"
                      style={{ fontFamily: "Outfit, sans-serif" }}
                    >
                      STATUS
                    </th>
                    <th
                      className="px-4 py-3.5 text-[11px] font-bold uppercase tracking-wider whitespace-nowrap"
                      style={{ fontFamily: "Outfit, sans-serif" }}
                    >
                      USERS
                    </th>
                    <th
                      className="px-4 py-3.5 text-[11px] font-bold uppercase tracking-wider whitespace-nowrap"
                      style={{ fontFamily: "Outfit, sans-serif" }}
                    >
                      CREATED ON
                    </th>
                    <th className="w-12 px-3 py-3.5 text-right"></th>
                  </tr>
                </thead>

                {/* Table Body */}
                <tbody className="divide-y divide-slate-100 text-xs text-[#45515e]">
                  {paginatedOrgs.length > 0 ? (
                    paginatedOrgs.map((org) => {
                      const isSelected = selectedOrgs.includes(org.id);
                      return (
                        <tr
                          key={org.id}
                          onClick={() => handleRowClick(org)}
                          className={`hover:bg-slate-50/80 transition-colors cursor-pointer group ${
                            isSelected ? "bg-blue-50/30" : ""
                          }`}
                        >
                          {/* Checkbox */}
                          <td
                            className="px-4 py-3 text-center"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleSelectOne(org.id);
                            }}
                          >
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => {}}
                              className="w-3.5 h-3.5 rounded border-slate-300 accent-[#1456f0] cursor-pointer"
                            />
                          </td>

                          {/* Grip Handle */}
                          <td className="px-2 py-3 text-center text-slate-300 group-hover:text-slate-400 transition-colors">
                            <GripVertical className="w-3.5 h-3.5 mx-auto opacity-60" />
                          </td>

                          {/* Organization Name + Flag */}
                          <td className="px-4 py-3 font-semibold text-[#222222] whitespace-nowrap">
                            <div className="flex items-center gap-2">
                              {org.flag && <span className="text-base">{org.flag}</span>}
                              <span>{org.name}</span>
                            </div>
                          </td>

                          {/* Email */}
                          <td className="px-4 py-3 text-[#45515e] whitespace-nowrap">
                            {org.email}
                          </td>

                          {/* Industry */}
                          <td className="px-4 py-3 text-[#45515e] whitespace-nowrap">
                            {org.industry}
                          </td>

                          {/* Preferred Time */}
                          <td className="px-4 py-3 text-[#45515e] whitespace-nowrap">
                            {org.preferredTime}
                          </td>

                          {/* Status */}
                          <td className="px-4 py-3 whitespace-nowrap">
                            <span
                              className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold ${
                                org.status === "Active"
                                  ? "bg-emerald-50 text-[#10b981] border border-emerald-200/60"
                                  : "bg-slate-100 text-slate-500 border border-slate-200"
                              }`}
                            >
                              <span
                                className={`w-1.5 h-1.5 rounded-full ${
                                  org.status === "Active" ? "bg-[#10b981]" : "bg-slate-400"
                                }`}
                              />
                              {org.status}
                            </span>
                          </td>

                          {/* Users */}
                          <td className="px-4 py-3 text-[#45515e] whitespace-nowrap">
                            {org.users} {org.users === 1 ? "Users" : "Users"}
                          </td>

                          {/* Created On */}
                          <td className="px-4 py-3 text-[#64748b] whitespace-nowrap">
                            {org.createdDate}
                          </td>

                          {/* Row Action / Chevron */}
                          <td className="px-3 py-3 text-right">
                            <div className="flex items-center justify-end gap-1">
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setEditingOrg(org);
                                  setShowEditModal(true);
                                }}
                                className="p-1.5 text-slate-400 hover:text-[#1456f0] hover:bg-blue-50 rounded-lg transition-colors"
                                title="Edit"
                              >
                                <Edit className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setDeletingOrg(org);
                                  setShowDeleteModal(true);
                                }}
                                className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                                title="Delete"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                              <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-slate-700 transition-colors ml-1" />
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan={10} className="px-6 py-12 text-center text-slate-400">
                        No organizations found matching your search.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination Footer Bar */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-5 py-3.5 border-t border-slate-100 bg-white/40 text-xs text-[#64748b]">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <span>Rows per page</span>
                  <select
                    value={rowsPerPage}
                    onChange={(e) => {
                      setRowsPerPage(Number(e.target.value));
                      setCurrentPage(1);
                    }}
                    className="px-2.5 py-1 bg-white border border-slate-200 rounded-lg text-xs text-[#222222] font-semibold focus:outline-none focus:ring-1 focus:ring-[#1456f0]"
                  >
                    <option value={10}>10</option>
                    <option value={15}>15</option>
                    <option value={25}>25</option>
                    <option value={50}>50</option>
                  </select>
                </div>

                <div className="h-4 w-px bg-slate-200" />

                <span>
                  Showing {filteredOrgs.length > 0 ? (currentPage - 1) * rowsPerPage + 1 : 0}
                  -
                  {Math.min(currentPage * rowsPerPage, filteredOrgs.length)} of {filteredOrgs.length}
                </span>
              </div>

              <div className="flex items-center gap-3">
                <span className="font-semibold uppercase tracking-wider text-[11px] text-[#8e8e93]">
                  PAGE {currentPage} / {totalPages}
                </span>

                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    disabled={currentPage <= 1}
                    onClick={() => setCurrentPage(1)}
                    className="p-1.5 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-800 disabled:opacity-30 disabled:pointer-events-none transition-colors cursor-pointer"
                  >
                    <ChevronsLeft className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    disabled={currentPage <= 1}
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    className="p-1.5 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-800 disabled:opacity-30 disabled:pointer-events-none transition-colors cursor-pointer"
                  >
                    <ChevronLeft className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    disabled={currentPage >= totalPages}
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                    className="p-1.5 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-800 disabled:opacity-30 disabled:pointer-events-none transition-colors cursor-pointer"
                  >
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    disabled={currentPage >= totalPages}
                    onClick={() => setCurrentPage(totalPages)}
                    className="p-1.5 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-800 disabled:opacity-30 disabled:pointer-events-none transition-colors cursor-pointer"
                  >
                    <ChevronsRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          </div>
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
                Industry
              </label>
              <select
                value={newOrg.industry}
                onChange={(e) => setNewOrg({ ...newOrg, industry: e.target.value })}
                className="w-full px-3 py-2 bg-white/90 border border-slate-200 rounded-xl text-xs text-[#222222] focus:outline-none focus:ring-2 focus:ring-[#1456f0]/20"
              >
                <option value="De Addiction Expert">De Addiction Expert</option>
                <option value="Healthcare">Healthcare</option>
                <option value="Technology">Technology</option>
                <option value="Dental">Dental</option>
                <option value="Mental Health">Mental Health</option>
                <option value="Finance">Finance</option>
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

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                  Industry
                </label>
                <select
                  value={editingOrg.industry}
                  onChange={(e) => setEditingOrg({ ...editingOrg, industry: e.target.value })}
                  className="w-full px-3 py-2 bg-white/90 border border-slate-200 rounded-xl text-xs text-[#222222] focus:outline-none focus:ring-2 focus:ring-[#1456f0]/20"
                >
                  <option value="De Addiction Expert">De Addiction Expert</option>
                  <option value="Healthcare">Healthcare</option>
                  <option value="Technology">Technology</option>
                  <option value="Dental">Dental</option>
                  <option value="Mental Health">Mental Health</option>
                  <option value="Finance">Finance</option>
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
    </div>
  );
}
