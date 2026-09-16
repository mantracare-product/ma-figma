import React, { useState, useRef, useEffect, useMemo } from "react";
import { Building2, ChevronDown, Check, MapPin, Video, Plus } from "lucide-react";
import { useOrganization } from "../../context/OrganizationContext";
import { useTeamMembers, TEAM_STORE_EVENT } from "../../../lib/teamStore";
import TargetUserDropdown from "./TargetUserDropdown";
import { toast } from "sonner";

export interface TargetUserLocationBarProps {
  selectedUserId: string | number;
  onSelectUser: (userId: string | number) => void;
  selectedLocationId: string;
  onSelectLocation: (locationId: string) => void;
  className?: string;
}

export default function TargetUserLocationBar({
  selectedUserId,
  onSelectUser,
  selectedLocationId,
  onSelectLocation,
  className = "",
}: TargetUserLocationBarProps) {
  const { activeOrganization } = useOrganization();
  const { bookableMembers } = useTeamMembers();

  const [activeLocVersion, setActiveLocVersion] = useState(0);
  const [isLocationDropdownOpen, setIsLocationDropdownOpen] = useState(false);
  const locationDropdownRef = useRef<HTMLDivElement>(null);

  // Re-read storage on external changes
  useEffect(() => {
    const handleUpdate = () => setActiveLocVersion((v) => v + 1);
    window.addEventListener("storage", handleUpdate);
    window.addEventListener(TEAM_STORE_EVENT, handleUpdate);
    return () => {
      window.removeEventListener("storage", handleUpdate);
      window.removeEventListener(TEAM_STORE_EVENT, handleUpdate);
    };
  }, []);

  // Organization Full Locations ONLY (from Settings / Storage)
  const allOrgLocations = useMemo<Array<{ id: string; name: string; isOnline?: boolean }>>(() => {
    const list: Array<{ id: string; name: string; isOnline?: boolean }> = [];
    const seenNames = new Set<string>();

    try {
      const saved = localStorage.getItem(`mantra_org_locations_${activeOrganization.id}`);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          parsed.forEach((l: any, idx: number) => {
            const isOnline =
              l.type === "online" ||
              l.name.toLowerCase().includes("online") ||
              l.name.toLowerCase().includes("telehealth") ||
              l.name.toLowerCase().includes("virtual");
            if (!seenNames.has(l.name.toLowerCase())) {
              seenNames.add(l.name.toLowerCase());
              list.push({
                id: l.id || `loc-${idx + 1}`,
                name: l.name,
                isOnline,
              });
            }
          });
        }
      }
    } catch {}

    const orgLocs =
      activeOrganization.locations && activeOrganization.locations.length > 0
        ? activeOrganization.locations
        : [activeOrganization.location || "California"];

    orgLocs.forEach((name, idx) => {
      const isOnline = name.toLowerCase().includes("online") || name.toLowerCase().includes("virtual");
      const formatted = isOnline
        ? "Online"
        : name.includes("Center") || name.includes("Clinic") || name.includes("Branch")
        ? name
        : `${name} Branch`;
      if (!seenNames.has(formatted.toLowerCase())) {
        seenNames.add(formatted.toLowerCase());
        list.push({
          id: `loc-${idx + 1}`,
          name: formatted,
          isOnline,
        });
      }
    });

    // Guarantee "Online" is available if not in list
    if (!list.some((l) => l.name.toLowerCase() === "online")) {
      list.push({ id: "loc-online", name: "Online", isOnline: true });
    }

    return list;
  }, [activeOrganization, activeLocVersion]);

  // Locations currently assigned to the selected user
  const userAssignedLocations = useMemo(() => {
    const locActiveKey = `mantra_user_loc_active_map_${selectedUserId}_${activeOrganization.id}`;
    let activeMap: Record<string, boolean> | null = null;
    try {
      const saved = localStorage.getItem(locActiveKey);
      if (saved) activeMap = JSON.parse(saved);
    } catch {}

    const currentMember = bookableMembers.find((m) => String(m.id) === String(selectedUserId));
    const memberLocsList = currentMember?.locations || (currentMember as any)?.availableLocations;

    if (activeMap && Object.keys(activeMap).length > 0) {
      const filtered = allOrgLocations.filter((loc) => activeMap![loc.id] === true || activeMap![loc.name] === true);
      if (filtered.length > 0) return filtered;
    }

    if (Array.isArray(memberLocsList) && memberLocsList.length > 0) {
      const filtered = allOrgLocations.filter(
        (loc) => memberLocsList.includes(loc.name) || memberLocsList.includes(loc.id)
      );
      if (filtered.length > 0) return filtered;
    }

    return allOrgLocations;
  }, [selectedUserId, activeOrganization.id, allOrgLocations, bookableMembers, activeLocVersion]);

  // Unassigned organization locations for this user
  const unassignedLocations = useMemo(() => {
    const assignedIds = new Set(userAssignedLocations.map((l) => l.id));
    const assignedNames = new Set(userAssignedLocations.map((l) => l.name.toLowerCase()));
    return allOrgLocations.filter((l) => !assignedIds.has(l.id) && !assignedNames.has(l.name.toLowerCase()));
  }, [allOrgLocations, userAssignedLocations]);

  // Sync selected location
  useEffect(() => {
    if (userAssignedLocations.length > 0 && !userAssignedLocations.some((l) => l.id === selectedLocationId || l.name === selectedLocationId)) {
      onSelectLocation(userAssignedLocations[0].id);
    }
  }, [userAssignedLocations, selectedLocationId, onSelectLocation]);

  const selectedLocation =
    allOrgLocations.find((l) => l.id === selectedLocationId || l.name === selectedLocationId) ||
    userAssignedLocations[0] ||
    allOrgLocations[0];

  // Assign an unassigned location to this user
  const handleAssignLocationToUser = (loc: { id: string; name: string; isOnline?: boolean }) => {
    const locActiveKey = `mantra_user_loc_active_map_${selectedUserId}_${activeOrganization.id}`;
    let activeMap: Record<string, boolean> = {};
    try {
      const saved = localStorage.getItem(locActiveKey);
      if (saved) activeMap = JSON.parse(saved);
    } catch {}

    userAssignedLocations.forEach((l) => {
      activeMap[l.id] = true;
    });
    activeMap[loc.id] = true;

    try {
      localStorage.setItem(locActiveKey, JSON.stringify(activeMap));
      window.dispatchEvent(new Event("storage"));
    } catch {}

    onSelectLocation(loc.id);
    setIsLocationDropdownOpen(false);
    toast.success(`Assigned location "${loc.name}" to team member`);
  };

  // Close location dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (locationDropdownRef.current && !locationDropdownRef.current.contains(e.target as Node)) {
        setIsLocationDropdownOpen(false);
      }
    };
    if (isLocationDropdownOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isLocationDropdownOpen]);

  return (
    <div
      className={`bg-white rounded-3xl border border-slate-200/80 p-4 sm:p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${className}`}
    >
      <div>
        <h3 className="text-sm font-bold text-slate-900" style={{ fontFamily: "DM Sans, sans-serif" }}>
          Target User &amp; Location
        </h3>
        <p className="text-xs text-slate-400 mt-0.5" style={{ fontFamily: "Outfit, sans-serif" }}>
          Select whose availability you are managing and for which clinic location
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        {/* Target User / Doctor Dropdown */}
        <TargetUserDropdown
          selectedUserId={selectedUserId}
          onSelectUser={onSelectUser}
        />

        {/* Location Dropdown */}
        <div className="relative" ref={locationDropdownRef}>
          <button
            type="button"
            onClick={() => setIsLocationDropdownOpen(!isLocationDropdownOpen)}
            className="w-full sm:w-auto min-w-[200px] flex items-center justify-between gap-2.5 px-3.5 py-2 text-xs font-semibold bg-white border border-slate-200 rounded-xl hover:border-slate-300 focus:outline-none focus:ring-2 focus:ring-primary/20 text-slate-800 transition-all shadow-2xs cursor-pointer text-left"
            style={{ fontFamily: "Outfit, sans-serif" }}
          >
            <div className="flex items-center gap-2 min-w-0">
              <div className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 ${selectedLocation?.isOnline ? "bg-blue-50 text-blue-600" : "bg-slate-100 text-slate-500"}`}>
                {selectedLocation?.isOnline ? <Video className="w-3 h-3" /> : <Building2 className="w-3 h-3" />}
              </div>
              <span className="truncate">
                {selectedLocation?.name || "Select Location"}
              </span>
            </div>
            <ChevronDown
              className={`w-4 h-4 text-slate-400 shrink-0 transition-transform duration-150 ${
                isLocationDropdownOpen ? "rotate-180" : ""
              }`}
            />
          </button>

          {/* Clean Dropdown Menu */}
          {isLocationDropdownOpen && (
            <div
              className="absolute right-0 sm:left-0 top-full mt-1.5 w-full sm:w-[260px] bg-white rounded-2xl border border-slate-200/90 shadow-xl z-50 overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-100"
              style={{ fontFamily: "Outfit, sans-serif" }}
            >
              <div className="p-2 border-b border-slate-100 bg-slate-50/60">
                <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider px-1">
                  Assigned Locations
                </div>
              </div>

              {/* User's Assigned Locations List */}
              <div className="max-h-[220px] overflow-y-auto p-1.5 space-y-0.5">
                {userAssignedLocations.map((loc) => {
                  const isSelected = loc.id === selectedLocationId || loc.name === selectedLocation?.name;
                  return (
                    <button
                      key={loc.id}
                      type="button"
                      onClick={() => {
                        onSelectLocation(loc.id);
                        setIsLocationDropdownOpen(false);
                      }}
                      className={`w-full flex items-center justify-between px-2.5 py-2 rounded-xl text-left transition-colors cursor-pointer text-xs ${
                        isSelected
                          ? "bg-blue-50/80 text-primary font-semibold"
                          : "hover:bg-slate-50 text-slate-700 font-medium"
                      }`}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        {loc.isOnline ? (
                          <Video className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                        ) : (
                          <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        )}
                        <span className="truncate">{loc.name}</span>
                      </div>
                      {isSelected && <Check className="w-3.5 h-3.5 text-primary shrink-0" />}
                    </button>
                  );
                })}
              </div>

              {/* If there are unassigned locations in the organization */}
              {unassignedLocations.length > 0 && (
                <div className="p-1.5 border-t border-slate-100 bg-slate-50/40">
                  <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-2 py-1">
                    Add Unassigned Location
                  </div>
                  {unassignedLocations.map((loc) => (
                    <button
                      key={loc.id}
                      type="button"
                      onClick={() => handleAssignLocationToUser(loc)}
                      className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-left text-xs text-slate-600 hover:bg-blue-50 hover:text-primary transition-colors cursor-pointer"
                    >
                      <div className="flex items-center gap-1.5 truncate">
                        <Plus className="w-3.5 h-3.5 text-primary shrink-0" />
                        <span className="truncate">{loc.name}</span>
                      </div>
                      <span className="text-[10px] font-semibold text-primary/80 shrink-0">Assign</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
