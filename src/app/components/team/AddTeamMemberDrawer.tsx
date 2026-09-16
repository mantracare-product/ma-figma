import React, { useState, useEffect, useMemo } from "react";
import { Drawer } from "../ui/drawer";
import { ChevronDown, MapPin, Video, Building2 } from "lucide-react";
import { toast } from "sonner";
import { addTeamMemberToStore, TeamMember, TEAM_STORE_EVENT } from "../../../lib/teamStore";
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
  const [locVersion, setLocVersion] = useState(0);

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

  useEffect(() => {
    if (isOpen) {
      setName("");
      setEmail("");
      setDepartment("");
      setRole("Specialist");
      setCanBookAppointments(initialCanBookAppointments);
      setSelectedLocationIds(orgLocations.map((l) => l.id));
    }
  }, [isOpen, initialCanBookAppointments, orgLocations]);

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

    if (canBookAppointments && selectedLocationIds.length === 0) {
      toast.error("Please select at least one available location for appointment booking");
      return;
    }

    const selectedLocationNames = orgLocations
      .filter((l) => selectedLocationIds.includes(l.id))
      .map((l) => l.name);

    const created = addTeamMemberToStore({
      name: name.trim(),
      email: email.trim(),
      role,
      department: department || undefined,
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
