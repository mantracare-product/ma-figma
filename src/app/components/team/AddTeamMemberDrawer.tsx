import React, { useState, useEffect } from "react";
import { Drawer } from "../ui/drawer";
import { ChevronDown } from "lucide-react";
import { toast } from "sonner";
import { addTeamMemberToStore, TeamMember } from "../../../lib/teamStore";
import { useOrganization } from "../../context/OrganizationContext";

export interface AddTeamMemberDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (newMember: TeamMember) => void;
  initialCanBookAppointments?: boolean;
}

const DEFAULT_DEPARTMENTS = ["Engineering", "Medical", "Sales", "Reception"];
const DEFAULT_ROLES = [
  { id: "1", name: "Admin", department: "Engineering" },
  { id: "2", name: "Manager", department: "Medical" },
  { id: "3", name: "Specialist", department: "Medical" },
  { id: "4", name: "Reception", department: "Reception" },
  { id: "5", name: "Sales", department: "Sales" },
  { id: "6", name: "Agent", department: "Sales" },
];

export default function AddTeamMemberDrawer({
  isOpen,
  onClose,
  onSuccess,
  initialCanBookAppointments = true,
}: AddTeamMemberDrawerProps) {
  const { activeOrganization } = useOrganization();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [department, setDepartment] = useState("");
  const [role, setRole] = useState("Specialist");
  const [canBookAppointments, setCanBookAppointments] = useState(initialCanBookAppointments);

  useEffect(() => {
    if (isOpen) {
      setName("");
      setEmail("");
      setDepartment("");
      setRole("Specialist");
      setCanBookAppointments(initialCanBookAppointments);
    }
  }, [isOpen, initialCanBookAppointments]);

  const handleSave = () => {
    if (!name.trim() || !email.trim()) {
      toast.error("Please fill in all required fields");
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      toast.error("Please enter a valid email address");
      return;
    }

    const created = addTeamMemberToStore({
      name: name.trim(),
      email: email.trim(),
      role,
      department: department || undefined,
      status: true,
      organizationId: activeOrganization?.id || "1",
      canBookAppointments,
    });

    toast.success(`Team member "${created.name}" added successfully`);
    if (onSuccess) {
      onSuccess(created);
    }
    onClose();
  };

  const filteredRoles = department
    ? DEFAULT_ROLES.filter((r) => r.department === department)
    : DEFAULT_ROLES;

  return (
    <Drawer
      isOpen={isOpen}
      onClose={onClose}
      title={
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="text-slate-800"
            >
              <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
              <circle cx="9" cy="7" r="4" />
              <line x1="19" y1="8" x2="19" y2="14" />
              <line x1="22" y1="11" x2="16" y2="11" />
            </svg>
          </div>
          <div>
            <div className="text-base font-bold text-slate-900" style={{ fontFamily: "Outfit, sans-serif" }}>
              Add Team Member
            </div>
            <div className="text-[11px] text-slate-400" style={{ fontFamily: "Outfit, sans-serif" }}>
              Fill in the details below to add a new user
            </div>
          </div>
        </div>
      }
      maxWidth="max-w-[420px] w-full sm:max-w-[480px]"
    >
      <div className="space-y-4" style={{ fontFamily: "Outfit, sans-serif" }}>
        {/* Name */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1.5">
            Name <span className="text-red-500">*</span>
          </label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Enter team member name"
            className="w-full px-3.5 py-2.5 text-sm border border-slate-200 rounded-xl bg-white focus:outline-none focus:border-slate-400 transition-colors"
          />
        </div>

        {/* Email */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1.5">
            Email <span className="text-red-500">*</span>
          </label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Enter email address"
            className="w-full px-3.5 py-2.5 text-sm border border-slate-200 rounded-xl bg-white focus:outline-none focus:border-slate-400 transition-colors"
          />
        </div>

        {/* Department (optional) */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1.5">
            <span className="flex items-center gap-1.5">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="12"
                height="12"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="text-slate-500"
              >
                <path d="M6 22V4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v18Z" />
                <path d="M6 12H4a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h2" />
                <path d="M18 9h2a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2h-2" />
                <path d="M10 6h4" />
                <path d="M10 10h4" />
                <path d="M10 14h4" />
                <path d="M10 18h4" />
              </svg>
              Department <span className="text-slate-400 font-normal">(optional)</span>
            </span>
          </label>
          <div className="relative">
            <select
              value={department}
              onChange={(e) => {
                setDepartment(e.target.value);
                setRole("Specialist");
              }}
              className="w-full px-3.5 py-2.5 text-sm border border-slate-200 rounded-xl bg-white focus:outline-none focus:border-slate-400 transition-colors appearance-none cursor-pointer"
            >
              <option value="">All departments</option>
              {DEFAULT_DEPARTMENTS.map((dept) => (
                <option key={dept} value={dept}>
                  {dept}
                </option>
              ))}
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none w-4 h-4 text-slate-400" />
          </div>
        </div>

        {/* Role */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1.5">
            Role <span className="text-red-500">*</span>
          </label>
          <div className="relative">
            <select
              value={role}
              onChange={(e) => setRole(e.target.value)}
              className="w-full px-3.5 py-2.5 text-sm border border-slate-200 rounded-xl bg-white focus:outline-none focus:border-slate-400 transition-colors appearance-none cursor-pointer"
            >
              {filteredRoles.map((r) => (
                <option key={r.id} value={r.name}>
                  {r.name}
                </option>
              ))}
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none w-4 h-4 text-slate-400" />
          </div>
        </div>

        {/* Checkbox: Can Book Appointments */}
        <div className="pt-2">
          <label className="flex items-start gap-3 p-3.5 rounded-xl border border-slate-200 bg-slate-50/70 hover:bg-slate-50 cursor-pointer transition-all">
            <input
              type="checkbox"
              checked={canBookAppointments}
              onChange={(e) => setCanBookAppointments(e.target.checked)}
              className="mt-0.5 w-4 h-4 rounded border-slate-300 text-primary focus:ring-primary/20 cursor-pointer accent-blue-600 shrink-0"
            />
            <div className="space-y-0.5 min-w-0">
              <div className="text-xs font-bold text-slate-900">
                Allow appointment booking for this team member
              </div>
              <p className="text-[11px] text-slate-500 leading-relaxed">
                When enabled, this team member will appear in Appointments for availability and scheduling.
              </p>
            </div>
          </label>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-3 pt-3 border-t border-slate-100">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 px-4 py-2.5 text-sm font-semibold text-slate-700 border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-bold bg-slate-900 text-white rounded-xl hover:bg-slate-800 transition-colors cursor-pointer shadow-xs"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
              <polyline points="17 21 17 13 7 13 7 21" />
              <polyline points="7 3 7 8 15 8" />
            </svg>
            Add Team Member
          </button>
        </div>
      </div>
    </Drawer>
  );
}
