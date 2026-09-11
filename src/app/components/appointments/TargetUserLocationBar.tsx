import React, { useState, useRef, useEffect, useMemo } from "react";
import { Building2, ChevronDown, Check, Plus, MapPin } from "lucide-react";
import { toast } from "sonner";
import { useOrganization } from "../../context/OrganizationContext";
import { useTeamMembers, TEAM_STORE_EVENT } from "../../../lib/teamStore";
import TargetUserDropdown from "./TargetUserDropdown";

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
  const [isAddingCustom, setIsAddingCustom] = useState(false);
  const [customLocationName, setCustomLocationName] = useState("");
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

  // Organization Full Locations
  const orgLocations = useMemo<Array<{ id: string; name: string }>>(() => {
    try {
      const saved = localStorage.getItem(`mantra_org_locations_${activeOrganization.id}`);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed.map((l: any, idx: number) => ({
            id: l.id || `loc-${idx + 1}`,
            name: l.name,
          }));
        }
      }
    } catch {}

    const orgLocs =
      activeOrganization.locations && activeOrganization.locations.length > 0
        ? activeOrganization.locations
        : [activeOrganization.location || "California"];

    return orgLocs.map((name, idx) => ({
      id: `loc-${idx + 1}`,
      name:
        name.includes("Center") || name.includes("Clinic") || name.includes("Branch")
          ? name
          : `${name} Branch`,
    }));
  }, [activeOrganization, activeLocVersion]);

  // Locations currently ACTIVE for this selected team member
  const locations = useMemo<Array<{ id: string; name: string }>>(() => {
    const locActiveKey = `mantra_user_loc_active_map_${selectedUserId}_${activeOrganization.id}`;
    let activeMap: Record<string, boolean> | null = null;
    try {
      const saved = localStorage.getItem(locActiveKey);
      if (saved) {
        activeMap = JSON.parse(saved);
      }
    } catch {}

    const currentMember = bookableMembers.find((m) => String(m.id) === String(selectedUserId));
    const memberLocsList = currentMember?.locations || (currentMember as any)?.availableLocations;

    if (activeMap && Object.keys(activeMap).length > 0) {
      const filtered = orgLocations.filter((loc) => activeMap![loc.id] === true);
      if (filtered.length > 0) return filtered;
    }

    if (Array.isArray(memberLocsList) && memberLocsList.length > 0) {
      const filtered = orgLocations.filter(
        (loc) => memberLocsList.includes(loc.name) || memberLocsList.includes(loc.id)
      );
      if (filtered.length > 0) return filtered;
    }

    // Default: first location
    return orgLocations.slice(0, 1);
  }, [selectedUserId, activeOrganization.id, orgLocations, bookableMembers, activeLocVersion]);

  // Other available locations that this team member can take appointments at
  const otherAvailableLocations = useMemo(() => {
    const unassigned = orgLocations.filter(
      (ol) => !locations.some((l) => l.id === ol.id || l.name.toLowerCase() === ol.name.toLowerCase())
    );

    // Provide default suggested clinics if organization only has 1 branch configured
    const suggestions = [
      { id: "loc-ny", name: "New York Branch" },
      { id: "loc-tx", name: "Texas Branch" },
      { id: "loc-fl", name: "Florida Branch" },
      { id: "loc-tele", name: "Telehealth / Virtual Clinic" },
    ];

    const extra = suggestions.filter(
      (sug) =>
        !locations.some((l) => l.name.toLowerCase() === sug.name.toLowerCase()) &&
        !unassigned.some((u) => u.name.toLowerCase() === sug.name.toLowerCase())
    );

    return [...unassigned, ...extra];
  }, [orgLocations, locations]);

  // Sync selected location
  useEffect(() => {
    if (locations.length > 0 && !locations.some((l) => l.id === selectedLocationId)) {
      onSelectLocation(locations[0].id);
    }
  }, [locations, selectedLocationId, onSelectLocation]);

  const selectedLocation =
    locations.find((l) => l.id === selectedLocationId) || locations[0] || orgLocations[0];

  // Close location dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (locationDropdownRef.current && !locationDropdownRef.current.contains(e.target as Node)) {
        setIsLocationDropdownOpen(false);
        setIsAddingCustom(false);
      }
    };
    if (isLocationDropdownOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isLocationDropdownOpen]);

  const selectedTeamMemberObj = useMemo(() => {
    const fromStore = bookableMembers.find((m) => String(m.id) === String(selectedUserId));
    if (fromStore) return fromStore;
    return {
      id: selectedUserId,
      name: "Team Member",
      email: "",
      role: "Team Member",
    };
  }, [bookableMembers, selectedUserId]);

  // Add an existing other location to this team member's active locations
  const handleAddLocationForMember = (locToAdd: { id: string; name: string }) => {
    // 1. Ensure location is registered in org locations
    try {
      const orgLocKey = `mantra_org_locations_${activeOrganization.id}`;
      const saved = localStorage.getItem(orgLocKey);
      let list: Array<{ id: string; name: string }> = saved ? JSON.parse(saved) : [...orgLocations];
      if (!list.some((l) => l.id === locToAdd.id || l.name === locToAdd.name)) {
        list.push({ id: locToAdd.id, name: locToAdd.name });
        localStorage.setItem(orgLocKey, JSON.stringify(list));
      }
    } catch {}

    // 2. Activate for this member
    const locActiveKey = `mantra_user_loc_active_map_${selectedUserId}_${activeOrganization.id}`;
    let activeMap: Record<string, boolean> = {};
    try {
      const saved = localStorage.getItem(locActiveKey);
      if (saved) activeMap = JSON.parse(saved);
    } catch {}

    // Keep all currently active locations
    locations.forEach((l) => {
      activeMap[l.id] = true;
    });
    activeMap[locToAdd.id] = true;

    try {
      localStorage.setItem(locActiveKey, JSON.stringify(activeMap));
    } catch {}

    // 3. Notify app components
    window.dispatchEvent(new Event(TEAM_STORE_EVENT));
    window.dispatchEvent(new Event("storage"));
    setActiveLocVersion((v) => v + 1);

    // 4. Select newly enabled location and close
    onSelectLocation(locToAdd.id);
    setIsLocationDropdownOpen(false);
    toast.success(`${locToAdd.name} added for ${selectedTeamMemberObj.name}`);
  };

  // Add a brand new custom location directly from dropdown without opening drawer
  const handleAddCustomLocation = () => {
    const trimmed = customLocationName.trim();
    if (!trimmed) return;

    const newLocId = `loc-${Date.now()}`;
    const newLoc = {
      id: newLocId,
      name:
        trimmed.includes("Center") || trimmed.includes("Clinic") || trimmed.includes("Branch")
          ? trimmed
          : `${trimmed} Branch`,
    };

    handleAddLocationForMember(newLoc);
    setCustomLocationName("");
    setIsAddingCustom(false);
  };

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
            className="w-full sm:w-auto min-w-[190px] flex items-center justify-between gap-2.5 px-3 py-2 text-xs font-semibold bg-white border border-slate-200 rounded-xl hover:border-slate-300 focus:outline-none focus:ring-2 focus:ring-primary/20 text-slate-800 transition-all shadow-2xs cursor-pointer text-left"
            style={{ fontFamily: "Outfit, sans-serif" }}
          >
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-5 h-5 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 shrink-0">
                <Building2 className="w-3 h-3" />
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

          {/* Dropdown Menu */}
          {isLocationDropdownOpen && (
            <div
              className="absolute right-0 sm:left-0 top-full mt-1.5 w-full sm:w-[300px] bg-white rounded-2xl border border-slate-200/90 shadow-xl z-50 overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-100"
              style={{ fontFamily: "Outfit, sans-serif" }}
            >
              {/* Active Locations Header */}
              <div className="p-2.5 border-b border-slate-100 bg-slate-50/50">
                <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider px-1">
                  Active Locations
                </div>
              </div>

              {/* Active Locations List */}
              <div className="max-h-[140px] overflow-y-auto p-1.5 space-y-0.5">
                {locations.map((loc) => {
                  const isSelected = loc.id === selectedLocationId;
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
                        <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                        <span className="truncate">{loc.name}</span>
                      </div>
                      {isSelected && <Check className="w-3.5 h-3.5 text-primary shrink-0" />}
                    </button>
                  );
                })}
              </div>

              {/* Other Available Locations Section */}
              <div className="p-2.5 border-t border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
                <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider px-1">
                  Other Available Locations
                </div>
              </div>

              <div className="max-h-[150px] overflow-y-auto p-1.5 space-y-0.5">
                {otherAvailableLocations.length === 0 ? (
                  <div className="px-2.5 py-2 text-[11px] text-slate-400 italic">
                    All locations are currently active
                  </div>
                ) : (
                  otherAvailableLocations.map((otherLoc) => (
                    <button
                      key={otherLoc.id}
                      type="button"
                      onClick={() => handleAddLocationForMember(otherLoc)}
                      className="w-full flex items-center justify-between px-2.5 py-2 rounded-xl text-left hover:bg-blue-50/70 text-slate-700 transition-colors cursor-pointer text-xs group"
                      title={`Enable ${otherLoc.name} for ${selectedTeamMemberObj.name}`}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <Building2 className="w-3 h-3 text-slate-400 group-hover:text-primary shrink-0" />
                        <span className="truncate">{otherLoc.name}</span>
                      </div>
                      <span className="inline-flex items-center gap-1 text-[11px] text-primary font-semibold px-2 py-0.5 rounded-full bg-blue-50 group-hover:bg-blue-100 transition-colors">
                        <Plus className="w-3 h-3" />
                        Add
                      </span>
                    </button>
                  ))
                )}
              </div>

              {/* Quick Add Custom Location Option without drawer */}
              <div className="p-2 border-t border-slate-100 bg-slate-50/40">
                {isAddingCustom ? (
                  <div className="flex items-center gap-1.5">
                    <input
                      type="text"
                      autoFocus
                      placeholder="e.g. Westside Clinic"
                      value={customLocationName}
                      onChange={(e) => setCustomLocationName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          handleAddCustomLocation();
                        } else if (e.key === "Escape") {
                          setIsAddingCustom(false);
                          setCustomLocationName("");
                        }
                      }}
                      className="flex-1 px-2.5 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-primary text-slate-800"
                    />
                    <button
                      type="button"
                      onClick={handleAddCustomLocation}
                      className="px-2.5 py-1.5 bg-[#1456f0] hover:bg-[#1044bf] text-white rounded-lg text-xs font-semibold transition-colors cursor-pointer"
                    >
                      Add
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setIsAddingCustom(false);
                        setCustomLocationName("");
                      }}
                      className="px-2 py-1.5 text-slate-400 hover:text-slate-600 text-xs"
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setIsAddingCustom(true)}
                    className="w-full flex items-center gap-1.5 px-2.5 py-1.5 text-[11px] font-semibold text-primary hover:bg-primary/5 rounded-lg transition-colors cursor-pointer text-left"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Add custom location...
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
