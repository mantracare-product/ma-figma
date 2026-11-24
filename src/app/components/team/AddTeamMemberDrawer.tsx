import React, { useState, useEffect, useMemo, useRef } from "react";
import { Drawer } from "../ui/drawer";
import { ChevronDown, MapPin, Video, Building2, Copy, Check, ExternalLink, Mail, CheckCircle2, Shield, X, Plus } from "lucide-react";
import { toast } from "sonner";
import { addTeamMemberToStore, TeamMember, TEAM_STORE_EVENT } from "../../../lib/teamStore";
import { getStoredDepartments } from "../../../lib/departmentStore";
import { useOrganization } from "../../context/OrganizationContext";

export interface AddTeamMemberDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (newMember: TeamMember) => void;
  initialCanBookAppointments?: boolean;
  initialDepartment?: string;
}

const DEFAULT_DEPARTMENTS = ["Clinical Operations", "Administration", "Customer Support"];
const DEFAULT_ROLES = [
  { id: "admin", name: "Admin", department: "Administration" },
  { id: "manager", name: "Manager", department: "Administration" },
  { id: "specialist", name: "Specialist", department: "Clinical Operations" },
  { id: "reception", name: "Reception", department: "Customer Support" },
  { id: "sales", name: "Sales", department: "Customer Support" },
  { id: "agent", name: "Agent", department: "Customer Support" },
];

export default function AddTeamMemberDrawer({
  isOpen,
  onClose,
  onSuccess,
  initialCanBookAppointments = true,
  initialDepartment = "",
}: AddTeamMemberDrawerProps) {
  const { activeOrganization } = useOrganization();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [assignedDepartments, setAssignedDepartments] = useState<
    Array<{ department: string; role: string }>
  >([]);
  const [isDeptDropdownOpen, setIsDeptDropdownOpen] = useState(false);
  const [selectedDeptInput, setSelectedDeptInput] = useState("");
  const [selectedRoleInput, setSelectedRoleInput] = useState("Admin");
  const [canBookAppointments, setCanBookAppointments] = useState(initialCanBookAppointments);
  const [locVersion, setLocVersion] = useState(0);

  // Invitation Success & Copy Link State
  const [invitedMember, setInvitedMember] = useState<TeamMember | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);

  // Listen to storage/team updates
  useEffect(() => {
    const handleUpdate = () => setLocVersion((v) => v + 1);
    window.addEventListener("storage", handleUpdate);
    window.addEventListener(TEAM_STORE_EVENT, handleUpdate);
    return () => {
      window.removeEventListener("storage", handleUpdate);
      window.removeEventListener(TEAM_STORE_EVENT, handleUpdate);
    };
  }, []);

  const availableDepts = useMemo(() => {
    try {
      const stored = getStoredDepartments();
      if (stored && stored.length > 0) return stored.map((d) => d.name);
    } catch {}
    return DEFAULT_DEPARTMENTS;
  }, [isOpen, locVersion]);

  const availableRolesList = useMemo(() => {
    try {
      const raw = sessionStorage.getItem("settings_roles");
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed.map((r: any) => ({
            id: r.id || r.name,
            name: r.name,
            department: r.department,
          }));
        }
      }
    } catch {}
    return DEFAULT_ROLES;
  }, [isOpen, locVersion]);

  // Fetch organization locations strictly from storage / context + Online
  const orgLocations = useMemo(() => {
    const list: Array<{ id: string; name: string; isOnline?: boolean }> = [];
    const seen = new Set<string>();

    try {
      const saved = localStorage.getItem(`mantra_org_locations_${activeOrganization?.id || "1"}`);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          parsed.forEach((l: any, idx: number) => {
            const isOnline =
              l.type === "online" ||
              l.name.toLowerCase().includes("online") ||
              l.name.toLowerCase().includes("virtual");
            if (!seen.has(l.name.toLowerCase())) {
              seen.add(l.name.toLowerCase());
              list.push({ id: l.id || `loc-${idx + 1}`, name: l.name, isOnline });
            }
          });
        }
      }
    } catch {}

    const orgLocs =
      activeOrganization?.locations && activeOrganization.locations.length > 0
        ? activeOrganization.locations
        : [activeOrganization?.location || "California"];

    orgLocs.forEach((name: string, idx: number) => {
      const isOnline = name.toLowerCase() === "online" || name.toLowerCase().includes("virtual");
      const formatted = isOnline
        ? "Online"
        : name.includes("Center") || name.includes("Clinic") || name.includes("Branch")
        ? name
        : `${name} Branch`;
      if (!seen.has(formatted.toLowerCase())) {
        seen.add(formatted.toLowerCase());
        list.push({ id: `loc-${idx + 1}`, name: formatted, isOnline });
      }
    });

    if (!list.some((l) => l.name.toLowerCase() === "online")) {
      list.push({ id: "loc-online", name: "Online", isOnline: true });
    }

    return list;
  }, [activeOrganization, locVersion]);

  const [selectedLocationIds, setSelectedLocationIds] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const prevIsOpenRef = useRef(false);

  useEffect(() => {
    if (isOpen && !prevIsOpenRef.current) {
      setName("");
      setEmail("");
      const firstDept = initialDepartment || availableDepts[0] || "Clinical Operations";
      const matchingRole = availableRolesList.find(
        (r) => (r.department || "").toLowerCase() === firstDept.toLowerCase()
      );
      setSelectedDeptInput(firstDept);
      setSelectedRoleInput(matchingRole?.name || availableRolesList[0]?.name || "Specialist");
      if (initialDepartment) {
        setAssignedDepartments([{ department: initialDepartment, role: "Member" }]);
      } else {
        setAssignedDepartments([]);
      }
      setIsDeptDropdownOpen(false);
      setCanBookAppointments(initialCanBookAppointments);
      setSelectedLocationIds(orgLocations.map((l) => l.id));
      setInvitedMember(null);
      setCopiedLink(false);
      setIsSubmitting(false);
    }
    prevIsOpenRef.current = isOpen;
  }, [isOpen, initialCanBookAppointments, initialDepartment, availableDepts, availableRolesList, orgLocations]);

  const handleAssignDepartment = () => {
    if (!selectedDeptInput) {
      toast.error("Please select a department");
      return;
    }
    if (assignedDepartments.some((d) => d.department.toLowerCase() === selectedDeptInput.toLowerCase())) {
      toast.info(`"${selectedDeptInput}" is already assigned.`);
    } else {
      setAssignedDepartments((prev) => [
        ...prev,
        { department: selectedDeptInput, role: "Member" },
      ]);
      toast.success(`Assigned to "${selectedDeptInput}"`);
    }
  };

  const handleSave = () => {
    if (isSubmitting) return;

    if (!name.trim() || !email.trim()) {
      toast.error("Please fill in all required fields");
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      toast.error("Please enter a valid email address");
      return;
    }

    if (canBookAppointments && selectedLocationIds.length === 0) {
      toast.error("Please select at least one available location for appointment booking");
      return;
    }

    setIsSubmitting(true);

    const selectedLocationNames = orgLocations
      .filter((l) => selectedLocationIds.includes(l.id))
      .map((l) => l.name);

    let finalAssigned = [...assignedDepartments];
    if (finalAssigned.length === 0 && selectedDeptInput) {
      finalAssigned = [{ department: selectedDeptInput, role: selectedRoleInput }];
    }

    const primaryRole = finalAssigned[0]?.role || selectedRoleInput || "Admin";
    const departmentStr = finalAssigned.map((d) => d.department).join(", ");
    const deptList = finalAssigned.map((d) => d.department);

    const created = addTeamMemberToStore({
      name: name.trim(),
      email: email.trim(),
      role: primaryRole,
      department: departmentStr || undefined,
      departments: deptList,
      assignedDepartments: finalAssigned,
      status: true,
      organizationId: activeOrganization?.id || "1",
      canBookAppointments,
      locations: selectedLocationNames,
    });

    // Save active locations map for this member
    try {
      const activeMap: Record<string, boolean> = {};
      orgLocations.forEach((loc) => {
        activeMap[loc.id] = selectedLocationIds.includes(loc.id);
        activeMap[loc.name] = selectedLocationIds.includes(loc.id);
      });
      localStorage.setItem(
        `mantra_user_loc_active_map_${created.id}_${activeOrganization?.id || "1"}`,
        JSON.stringify(activeMap)
      );
      window.dispatchEvent(new Event("storage"));
    } catch {}

    const directInviteUrl = `${window.location.origin}/chats?memberId=${created.id}&invite=1`;

    try {
      if (typeof navigator !== "undefined" && navigator.clipboard) {
        navigator.clipboard.writeText(directInviteUrl);
        setCopiedLink(true);
      }
    } catch {}

    toast.success(`Team member "${created.name}" added & invitation link copied!`, {
      description: directInviteUrl,
      action: {
        label: "Copy Link",
        onClick: () => {
          try {
            navigator.clipboard.writeText(directInviteUrl);
            toast.success("Invitation link copied to clipboard!");
          } catch {}
        },
      },
      duration: 8000,
    });

    setInvitedMember(created);
    setIsSubmitting(false);

    if (onSuccess) {
      onSuccess(created);
    }
  };

  const inviteUrl = invitedMember
    ? `${window.location.origin}/chats?memberId=${invitedMember.id}&invite=1`
    : "";

  const handleCopyLink = () => {
    if (!inviteUrl) return;
    try {
      navigator.clipboard.writeText(inviteUrl);
      setCopiedLink(true);
      toast.success("Invitation link copied to clipboard!");
      setTimeout(() => setCopiedLink(false), 2500);
    } catch {
      toast.success("Link copied!");
    }
  };

  const handleCloseAll = () => {
    setInvitedMember(null);
    onClose();
  };

  return (
    <Drawer
      isOpen={isOpen}
      onClose={handleCloseAll}
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
              {invitedMember ? "Team Member Invited" : "Add Team Member"}
            </div>
            <div className="text-[11px] text-slate-400" style={{ fontFamily: "Outfit, sans-serif" }}>
              {invitedMember ? "Invitation sent with direct login link" : "Fill in the details below to add a new user"}
            </div>
          </div>
        </div>
      }
      maxWidth="max-w-[420px] w-full sm:max-w-[480px]"
    >
      {invitedMember ? (
        <div className="space-y-4 py-1" style={{ fontFamily: "Outfit, sans-serif" }}>
          {/* Success Banner */}
          <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-start gap-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-xs">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div className="min-w-0 flex-1">
              <h4 className="text-xs font-bold text-emerald-900">
                Invitation Sent Automatically!
              </h4>
              <p className="text-[11px] text-emerald-700 mt-0.5 leading-relaxed">
                An invitation email was sent to{" "}
                <span className="font-semibold underline">{invitedMember.email}</span>.
              </p>
            </div>
          </div>

          {/* Member Card */}
          <div className="p-3.5 bg-slate-50/80 border border-slate-200 rounded-2xl space-y-2.5">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-slate-900 text-white flex items-center justify-center font-bold text-xs shadow-xs">
                {invitedMember.name
                  .split(" ")
                  .map((n) => n[0])
                  .join("")
                  .slice(0, 2)
                  .toUpperCase()}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <h3 className="text-xs font-bold text-slate-900 truncate">
                    {invitedMember.name}
                  </h3>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-50 text-purple-700 border border-purple-200">
                    {invitedMember.department || "General"}
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 truncate mt-0.5">
                  {invitedMember.email} · {invitedMember.department || "General"}
                </p>
              </div>
            </div>

            <div className="pt-2 border-t border-slate-200/80 flex items-center justify-between text-[11px] text-slate-600">
              <span className="flex items-center gap-1.5 font-medium">
                <Building2 className="w-3.5 h-3.5 text-purple-600" />
                Department:
              </span>
              <span className="font-semibold text-slate-800">
                {invitedMember.department || "General"}
              </span>
            </div>
          </div>

          {/* Copy Link Box */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-800">
                Direct User Invitation Link
              </label>
              <span className="text-[10px] text-slate-400">
                Role & permission enabled
              </span>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="text"
                readOnly
                value={inviteUrl}
                className="flex-1 px-3 py-2 text-xs font-mono bg-white border border-slate-200 rounded-xl text-slate-700 focus:outline-none select-all shadow-2xs truncate"
              />
              <button
                type="button"
                onClick={handleCopyLink}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-xs shrink-0 ${
                  copiedLink
                    ? "bg-emerald-600 text-white"
                    : "bg-[#1456f0] text-white hover:bg-blue-700"
                }`}
              >
                {copiedLink ? (
                  <>
                    <Check className="w-3.5 h-3.5" />
                    <span>Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copy Link</span>
                  </>
                )}
              </button>
            </div>
            <p className="text-[11px] text-slate-500 leading-relaxed">
              Opening this link will automatically open MantraAssist as{" "}
              <span className="font-bold text-slate-700">{invitedMember.name}</span> with their configured permissions.
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2.5 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={() => window.open(inviteUrl, "_blank")}
              className="flex-1 px-3 py-2.5 text-xs font-bold text-[#1456f0] bg-blue-50/70 hover:bg-blue-100 border border-blue-200 rounded-xl flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
            >
              <span>Open in New Tab</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={handleCloseAll}
              className="flex-1 px-4 py-2.5 text-xs font-bold bg-slate-900 text-white rounded-xl hover:bg-slate-800 transition-colors cursor-pointer shadow-xs"
            >
              Done
            </button>
          </div>
        </div>
      ) : (
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

        {/* Department Assignment */}
        <div className="space-y-2">
          <label className="block text-xs font-semibold text-slate-700">
            <span className="flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <Building2 className="w-3.5 h-3.5 text-slate-500" />
                Department
              </span>
              <span className="text-[11px] font-normal text-slate-400">
                {assignedDepartments.length > 0
                  ? `${assignedDepartments.length} assigned`
                  : "Assign department"}
              </span>
            </span>
          </label>

          {/* Collapsible Dropdown Wrapper */}
          <div className="border border-slate-200 rounded-xl overflow-hidden bg-white shadow-2xs">
            <button
              type="button"
              onClick={() => setIsDeptDropdownOpen((v) => !v)}
              className="w-full flex items-center justify-between px-3.5 py-2.5 text-xs font-medium text-slate-700 hover:bg-slate-50 cursor-pointer transition-colors"
            >
              <div className="flex items-center gap-2 truncate">
                <Building2 className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                <span className="truncate">
                  {assignedDepartments.length === 0
                    ? "Select department..."
                    : assignedDepartments.map((d) => d.department).join(", ")}
                </span>
              </div>
              <ChevronDown
                className={`w-4 h-4 text-slate-400 transition-transform shrink-0 ${
                  isDeptDropdownOpen ? "rotate-180" : ""
                }`}
              />
            </button>

            {/* Dropdown Content */}
            {isDeptDropdownOpen && (
              <div className="p-3 bg-slate-50/80 border-t border-slate-100 space-y-2.5">
                <div className="flex items-center gap-2">
                  <div className="relative flex-1">
                    <select
                      value={selectedDeptInput}
                      onChange={(e) => setSelectedDeptInput(e.target.value)}
                      className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg bg-white focus:outline-none focus:border-blue-500 transition-colors appearance-none cursor-pointer"
                    >
                      {availableDepts.map((dept) => (
                        <option key={dept} value={dept}>
                          {dept}
                        </option>
                      ))}
                    </select>
                    <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none w-3.5 h-3.5 text-slate-400" />
                  </div>
                  <button
                    type="button"
                    onClick={handleAssignDepartment}
                    className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold bg-slate-900 text-white rounded-lg hover:bg-slate-800 transition-colors cursor-pointer shrink-0 shadow-2xs"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Assign
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Assigned Departments List Tags */}
          {assignedDepartments.length > 0 && (
            <div className="flex flex-wrap gap-2 pt-1">
              {assignedDepartments.map((item, idx) => (
                <span
                  key={idx}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-purple-50 border border-purple-200 text-xs font-semibold text-purple-800 shadow-2xs"
                >
                  <Building2 className="w-3 h-3 text-purple-600" />
                  <span>{item.department}</span>
                  <button
                    type="button"
                    onClick={() =>
                      setAssignedDepartments((prev) =>
                        prev.filter((d) => d.department !== item.department)
                      )
                    }
                    className="ml-1 text-purple-400 hover:text-red-500 cursor-pointer p-0.5 rounded hover:bg-purple-100 transition-colors"
                    title="Remove assignment"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}
            </div>
          )}
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

        {/* Available Locations for Booking */}
        {canBookAppointments && (
          <div className="p-3.5 bg-slate-50/80 rounded-xl border border-slate-200 space-y-2.5">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                  Available Locations
                </div>
                <div className="text-[11px] text-slate-400">
                  Select clinic locations where this member can be booked
                </div>
              </div>
              {orgLocations.length > 1 && (
                <button
                  type="button"
                  onClick={() => {
                    if (selectedLocationIds.length === orgLocations.length) {
                      setSelectedLocationIds([]);
                    } else {
                      setSelectedLocationIds(orgLocations.map((l) => l.id));
                    }
                  }}
                  className="text-[11px] font-semibold text-primary hover:underline cursor-pointer"
                >
                  {selectedLocationIds.length === orgLocations.length ? "Deselect All" : "Select All"}
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 gap-1.5 max-h-[180px] overflow-y-auto pr-0.5">
              {orgLocations.length === 0 ? (
                <div className="p-2.5 text-center text-xs text-slate-400">
                  No organization locations found
                </div>
              ) : (
                orgLocations.map((loc, idx) => {
                  const isChecked = selectedLocationIds.includes(loc.id);
                  return (
                    <label
                      key={loc.id}
                      className={`flex items-center gap-2.5 px-3 py-2 rounded-lg border transition-all cursor-pointer ${
                        isChecked
                          ? "bg-white border-blue-200 text-slate-900 shadow-2xs"
                          : "bg-white/60 border-slate-200/80 text-slate-500 hover:bg-white"
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedLocationIds([...selectedLocationIds, loc.id]);
                          } else {
                            setSelectedLocationIds(selectedLocationIds.filter((id) => id !== loc.id));
                          }
                        }}
                        className="w-3.5 h-3.5 rounded border-slate-300 text-primary focus:ring-primary/20 cursor-pointer accent-blue-600 shrink-0"
                      />
                      <div className="flex items-center gap-1.5 flex-1 min-w-0">
                        {loc.isOnline ? (
                          <Video className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                        ) : (
                          <Building2 className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                        )}
                        <span className="text-xs font-medium truncate">{loc.name}</span>
                      </div>
                      {loc.isOnline ? (
                        <span className="text-[10px] font-semibold text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded">
                          Online
                        </span>
                      ) : idx === 0 ? (
                        <span className="text-[10px] font-semibold text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded">
                          Primary
                        </span>
                      ) : null}
                    </label>
                  );
                })
              )}
            </div>
          </div>
        )}

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
            disabled={isSubmitting}
            onClick={handleSave}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-bold bg-slate-900 text-white rounded-xl hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors cursor-pointer shadow-xs"
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
            {isSubmitting ? "Adding..." : "Add Team Member"}
          </button>
        </div>
      </div>
      )}
    </Drawer>
  );
}
