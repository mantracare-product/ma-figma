import React, { useState, useEffect } from "react";
import {
  MapPin,
  Clock,
  Calendar,
  Plus,
  Trash2,
  ChevronDown,
  X,
  Building2,
  Info,
  Lock,
  Video,
} from "lucide-react";
import { Button } from "../ui/Button";
import { Input } from "../ui/Input";
import { Tooltip } from "../ui/Tooltip";
import { toast } from "sonner";
import { useOrganization } from "../../context/OrganizationContext";
import { WeeklyAvailability } from "../../pages/Settings";
import { createDefaultAvailability } from "../../pages/settings-constants";

export interface LocationDayOff {
  id: string;
  date: string; // YYYY-MM-DD
  label?: string;
}

export interface OrganizationLocationItem {
  id: string;
  name: string;
  type?: "physical" | "online";
  address: string;
  city?: string;
  state?: string;
  zip?: string;
  country?: string;
  isPrimary: boolean;
  workingHours: WeeklyAvailability;
  daysOff?: LocationDayOff[];
}

const DAYS_OF_WEEK: Array<{ key: keyof WeeklyAvailability; label: string; short: string }> = [
  { key: "monday", label: "Monday", short: "Mon" },
  { key: "tuesday", label: "Tuesday", short: "Tue" },
  { key: "wednesday", label: "Wednesday", short: "Wed" },
  { key: "thursday", label: "Thursday", short: "Thu" },
  { key: "friday", label: "Friday", short: "Fri" },
  { key: "saturday", label: "Saturday", short: "Sat" },
  { key: "sunday", label: "Sunday", short: "Sun" },
];

const FIXED_ORG_COUNTRY = "United States";

interface OrganizationLocationsSectionProps {
  isEditing?: boolean;
}

export default function OrganizationLocationsSection({ isEditing = false }: OrganizationLocationsSectionProps) {
  const { activeOrganization, updateOrganization } = useOrganization();
  const storageKey = `mantra_org_locations_${activeOrganization.id}`;

  const [locations, setLocations] = useState<OrganizationLocationItem[]>(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed.map((l: any) => ({
            id: l.id || `loc-${Math.random()}`,
            name: l.name || "Location",
            type: l.type || (l.name?.toLowerCase().includes("online") ? "online" : "physical"),
            address: l.address || "",
            city: l.city || "",
            state: l.state || "",
            zip: l.zip || "",
            country: FIXED_ORG_COUNTRY,
            isPrimary: !!l.isPrimary,
            workingHours: l.workingHours || createDefaultAvailability(),
            daysOff: l.daysOff || [
              { id: `do-1`, date: "2026-12-25", label: "Christmas Day" },
              { id: `do-2`, date: "2027-01-01", label: "New Year's Day" },
            ],
          }));
        }
      }
    } catch (e) {
      console.error("Failed to parse locations from localStorage", e);
    }

    const orgLocs =
      activeOrganization.locations && activeOrganization.locations.length > 0
        ? [...activeOrganization.locations]
        : [activeOrganization.location || "California"];

    if (!orgLocs.some((l) => l.toLowerCase() === "online" || l.toLowerCase().includes("virtual"))) {
      orgLocs.push("Online");
    }

    return orgLocs.map((locName, idx) => {
      const isOnline = locName.toLowerCase() === "online" || locName.toLowerCase().includes("virtual");
      return {
        id: `loc-${idx + 1}-${Date.now()}`,
        name: isOnline
          ? "Online"
          : locName.includes("Center") || locName.includes("Clinic") || locName.includes("Branch")
          ? locName
          : `${locName} Branch`,
        type: isOnline ? ("online" as const) : ("physical" as const),
        address: isOnline
          ? "Virtual / Telehealth Consultation"
          : idx === 0
          ? "123 Healthcare Ave, Suite 100, San Francisco, CA 94102"
          : "450 Lexington Ave, Suite 240, New York, NY 10017",
        country: FIXED_ORG_COUNTRY,
        isPrimary: idx === 0,
        workingHours: createDefaultAvailability(),
        daysOff: [
          { id: `do-1-${idx}`, date: "2026-12-25", label: "Christmas Day" },
          { id: `do-2-${idx}`, date: "2027-01-01", label: "New Year's Day" },
        ],
      };
    });
  });

  const [expandedLocationId, setExpandedLocationId] = useState<string | null>(null);

  // Active sub-tab inside expanded location card: "hours" | "days-off"
  const [activeLocSubTab, setActiveLocSubTab] = useState<Record<string, "hours" | "days-off">>({});

  // Inline Add Day Off State per location
  const [addingDayOffForLoc, setAddingDayOffForLoc] = useState<string | null>(null);
  const [newDayOffDate, setNewDayOffDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [newDayOffLabel, setNewDayOffLabel] = useState("");

  // Add Location Form State
  const [showAddLocationInline, setShowAddLocationInline] = useState(false);
  const [newLocationType, setNewLocationType] = useState<"physical" | "online">("physical");
  const [newLocationName, setNewLocationName] = useState("");
  const [newLocationAddress, setNewLocationAddress] = useState("");
  const [newLocationCity, setNewLocationCity] = useState("");
  const [newLocationState, setNewLocationState] = useState("");
  const [newLocationZip, setNewLocationZip] = useState("");
  const [newLocationIsPrimary, setNewLocationIsPrimary] = useState(false);
  const [newLocationWorkingHours, setNewLocationWorkingHours] = useState<WeeklyAvailability>(() =>
    createDefaultAvailability()
  );
  const [newLocationDaysOff, setNewLocationDaysOff] = useState<LocationDayOff[]>([
    { id: "do-init-1", date: "2026-12-25", label: "Christmas Day" },
    { id: "do-init-2", date: "2027-01-01", label: "New Year's Day" },
  ]);
  const [newLocationTab, setNewLocationTab] = useState<"hours" | "days-off">("hours");
  const [newLocationHoursOpen, setNewLocationHoursOpen] = useState(true);

  // Auto-sync storage whenever locations change
  useEffect(() => {
    try {
      localStorage.setItem(storageKey, JSON.stringify(locations));
      window.dispatchEvent(new Event("storage"));
      window.dispatchEvent(new Event("mantra_locations_changed"));
    } catch (e) {
      console.error("Failed to write locations to localStorage", e);
    }
  }, [locations, storageKey]);

  // Reload when switching organizations
  useEffect(() => {
    try {
      const saved = localStorage.getItem(`mantra_org_locations_${activeOrganization.id}`);
      if (saved) {
        const parsed = JSON.parse(saved);
        setLocations(parsed);
      }
    } catch (e) {
      console.error("Failed to load organization locations", e);
    }
  }, [activeOrganization.id]);

  // Toggle day in existing location
  const handleToggleDay = (locId: string, dayKey: keyof WeeklyAvailability, enabled: boolean) => {
    setLocations((prev) =>
      prev.map((loc) => {
        if (loc.id !== locId) return loc;
        return {
          ...loc,
          workingHours: {
            ...loc.workingHours,
            [dayKey]: {
              ...loc.workingHours[dayKey],
              enabled,
            },
          },
        };
      })
    );
  };

  // Change time in existing location
  const handleTimeChange = (
    locId: string,
    dayKey: keyof WeeklyAvailability,
    field: "start" | "end",
    value: string
  ) => {
    setLocations((prev) =>
      prev.map((loc) => {
        if (loc.id !== locId) return loc;
        return {
          ...loc,
          workingHours: {
            ...loc.workingHours,
            [dayKey]: {
              ...loc.workingHours[dayKey],
              [field]: value,
            },
          },
        };
      })
    );
  };

  // Toggle day in New Location form
  const handleNewLocToggleDay = (dayKey: keyof WeeklyAvailability, enabled: boolean) => {
    setNewLocationWorkingHours((prev) => ({
      ...prev,
      [dayKey]: {
        ...prev[dayKey],
        enabled,
      },
    }));
  };

  // Change time in New Location form
  const handleNewLocTimeChange = (
    dayKey: keyof WeeklyAvailability,
    field: "start" | "end",
    value: string
  ) => {
    setNewLocationWorkingHours((prev) => ({
      ...prev,
      [dayKey]: {
        ...prev[dayKey],
        [field]: value,
      },
    }));
  };

  // Quick preset: Apply 9am-5pm to weekdays in New Location form
  const handleNewLocApplyWeekdayHours = () => {
    const updated = { ...newLocationWorkingHours };
    (["monday", "tuesday", "wednesday", "thursday", "friday"] as Array<keyof WeeklyAvailability>).forEach((d) => {
      updated[d] = { enabled: true, start: "09:00", end: "17:00" };
    });
    setNewLocationWorkingHours(updated);
    toast.success("Applied 9:00 AM – 5:00 PM (Mon–Fri)");
  };

  // Quick preset: Apply 9am-5pm to weekdays in existing location
  const handleApplyWeekdayHours = (locId: string) => {
    setLocations((prev) =>
      prev.map((loc) => {
        if (loc.id !== locId) return loc;
        const updated = { ...loc.workingHours };
        (["monday", "tuesday", "wednesday", "thursday", "friday"] as Array<keyof WeeklyAvailability>).forEach((d) => {
          updated[d] = { enabled: true, start: "09:00", end: "17:00" };
        });
        return { ...loc, workingHours: updated };
      })
    );
    toast.success("Applied 9:00 AM – 5:00 PM (Mon–Fri)");
  };

  // Add Day Off to an existing location
  const handleAddDayOff = (locId: string) => {
    if (!newDayOffDate) {
      toast.error("Please select a date for the day off");
      return;
    }

    const loc = locations.find((l) => l.id === locId);
    if (loc?.daysOff?.some((d) => d.date === newDayOffDate)) {
      toast.error("This date is already marked as a day off");
      return;
    }

    const newDay: LocationDayOff = {
      id: `do-${Date.now()}`,
      date: newDayOffDate,
      label: newDayOffLabel.trim() || "Location Closed",
    };

    setLocations((prev) =>
      prev.map((l) => {
        if (l.id !== locId) return l;
        const updatedDaysOff = [...(l.daysOff || []), newDay].sort((a, b) => a.date.localeCompare(b.date));
        return { ...l, daysOff: updatedDaysOff };
      })
    );

    setNewDayOffLabel("");
    setAddingDayOffForLoc(null);
    toast.success(`Added day off for ${newDayOffDate}`);
  };

  // Remove Day Off from an existing location
  const handleRemoveDayOff = (locId: string, dayOffId: string) => {
    setLocations((prev) =>
      prev.map((l) => {
        if (l.id !== locId) return l;
        return { ...l, daysOff: (l.daysOff || []).filter((d) => d.id !== dayOffId) };
      })
    );
    toast.success("Day off removed");
  };

  // Create new location
  const handleCreateLocation = () => {
    const isOnline = newLocationType === "online";
    const locName = isOnline ? (newLocationName.trim() || "Online") : newLocationName.trim();

    if (!locName) {
      toast.error("Location name is required");
      return;
    }

    const fullAddress = isOnline
      ? "Virtual / Telehealth Consultation"
      : [newLocationAddress.trim(), newLocationCity.trim(), newLocationState.trim(), newLocationZip.trim()]
          .filter(Boolean)
          .join(", ") || newLocationAddress.trim() || "";

    const newLoc: OrganizationLocationItem = {
      id: `loc-${Date.now()}`,
      name: locName,
      type: newLocationType,
      address: fullAddress,
      city: newLocationCity.trim(),
      state: newLocationState.trim(),
      zip: newLocationZip.trim(),
      country: FIXED_ORG_COUNTRY,
      isPrimary: newLocationIsPrimary || locations.length === 0,
      workingHours: newLocationWorkingHours,
      daysOff: newLocationDaysOff,
    };

    let updated = [...locations, newLoc];
    if (newLocationIsPrimary) {
      updated = updated.map((l) => (l.id === newLoc.id ? l : { ...l, isPrimary: false }));
    }

    setLocations(updated);
    setExpandedLocationId(null);

    // Sync to OrganizationContext
    const locNames = updated.map((l) => l.name);
    updateOrganization(activeOrganization.id, {
      locations: locNames,
      location: updated.find((l) => l.isPrimary)?.name || locNames[0],
    });

    // Reset form
    setNewLocationName("");
    setNewLocationAddress("");
    setNewLocationCity("");
    setNewLocationState("");
    setNewLocationZip("");
    setNewLocationType("physical");
    setNewLocationIsPrimary(false);
    setNewLocationWorkingHours(createDefaultAvailability());
    setNewLocationDaysOff([
      { id: "do-init-1", date: "2026-12-25", label: "Christmas Day" },
      { id: "do-init-2", date: "2027-01-01", label: "New Year's Day" },
    ]);
    setShowAddLocationInline(false);
    toast.success(`Location "${newLoc.name}" added successfully`);
  };

  // Update field in existing location
  const handleUpdateLocationField = (
    locId: string,
    field: keyof OrganizationLocationItem,
    value: any
  ) => {
    setLocations((prev) => {
      let updated = prev.map((loc) => {
        if (loc.id !== locId) return loc;
        return { ...loc, [field]: value };
      });

      if (field === "isPrimary" && value === true) {
        updated = updated.map((loc) => ({
          ...loc,
          isPrimary: loc.id === locId,
        }));
      }

      const locNames = updated.map((l) => l.name);
      const primaryName = updated.find((l) => l.isPrimary)?.name || locNames[0];
      updateOrganization(activeOrganization.id, {
        locations: locNames,
        location: primaryName,
      });

      return updated;
    });
  };

  // Delete location
  const handleDeleteLocation = (locId: string) => {
    if (locations.length <= 1) {
      toast.error("An organization must have at least one location");
      return;
    }
    const locToDelete = locations.find((l) => l.id === locId);
    if (!locToDelete) return;

    if (!window.confirm(`Are you sure you want to delete "${locToDelete.name}"?`)) {
      return;
    }

    let updated = locations.filter((l) => l.id !== locId);
    if (locToDelete.isPrimary && updated.length > 0) {
      updated[0].isPrimary = true;
    }

    setLocations(updated);
    if (expandedLocationId === locId) {
      setExpandedLocationId(null);
    }

    const locNames = updated.map((l) => l.name);
    updateOrganization(activeOrganization.id, {
      locations: locNames,
      location: updated.find((l) => l.isPrimary)?.name || locNames[0],
    });

    toast.success(`Removed location "${locToDelete.name}"`);
  };

  return (
    <div className="bg-white/90 rounded-[20px] p-6 border border-slate-200/70 shadow-2xs space-y-4">
      {/* Section Header */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-100">
        <div className="flex items-center gap-2">
          <h3 className="font-bold text-xs uppercase tracking-wider font-display text-slate-500">
            ORGANIZATION LOCATIONS
          </h3>
          <Tooltip text="Manage physical clinic addresses or Online / Virtual location with availability hours and days off for each.">
            <Info className="w-3.5 h-3.5 text-slate-400 hover:text-slate-600 transition-colors cursor-pointer" />
          </Tooltip>
          <span
            className="px-2 py-0.5 text-[11px] font-semibold rounded-full bg-blue-50 text-blue-700 border border-blue-100"
            style={{ fontFamily: "Outfit, sans-serif" }}
          >
            {locations.length} {locations.length === 1 ? "Location" : "Locations"}
          </span>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            setShowAddLocationInline(true);
            setNewLocationType("physical");
            setNewLocationWorkingHours(createDefaultAvailability());
          }}
          className="flex items-center gap-1.5 font-semibold border-primary/30 text-primary hover:bg-primary/5 cursor-pointer text-xs"
        >
          <Plus className="w-4 h-4" />
          Add Location
        </Button>
      </div>

      {/* Add New Location Form (Inline) */}
      {showAddLocationInline && (
        <div className="border border-blue-200 rounded-2xl p-5 bg-blue-50/20 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-slate-200/60">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-blue-100 flex items-center justify-center text-primary">
                <Plus className="w-4 h-4" />
              </div>
              <h4 className="text-sm font-bold text-slate-900" style={{ fontFamily: "DM Sans, sans-serif" }}>
                Add New Location
              </h4>
            </div>
            <button
              type="button"
              onClick={() => setShowAddLocationInline(false)}
              className="p-1 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
              title="Cancel"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="space-y-3.5">
            {/* Location Type Selector */}
            <div>
              <label className="text-xs font-semibold text-slate-700 mb-1.5 block">
                Location Type
              </label>
              <div className="grid grid-cols-2 gap-2.5 max-w-md">
                <button
                  type="button"
                  onClick={() => {
                    setNewLocationType("physical");
                    if (newLocationName === "Online") setNewLocationName("");
                  }}
                  className={`p-2.5 rounded-xl border flex items-center gap-2.5 transition-all cursor-pointer text-left ${
                    newLocationType === "physical"
                      ? "border-slate-900 bg-slate-900 text-white shadow-xs"
                      : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                  }`}
                >
                  <Building2 className={`w-4 h-4 shrink-0 ${newLocationType === "physical" ? "text-white" : "text-slate-500"}`} />
                  <span className="text-xs font-semibold">Physical Clinic</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setNewLocationType("online");
                    if (!newLocationName) setNewLocationName("Online");
                  }}
                  className={`p-2.5 rounded-xl border flex items-center gap-2.5 transition-all cursor-pointer text-left ${
                    newLocationType === "online"
                      ? "border-blue-600 bg-blue-600 text-white shadow-xs"
                      : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                  }`}
                >
                  <Video className={`w-4 h-4 shrink-0 ${newLocationType === "online" ? "text-white" : "text-blue-500"}`} />
                  <span className="text-xs font-semibold">Online / Virtual</span>
                </button>
              </div>
            </div>

            {/* Location Name */}
            <div>
              <label className="text-xs font-semibold text-slate-700 mb-1 block">
                Location Name *
              </label>
              <Input
                placeholder={newLocationType === "online" ? "e.g. Online" : "e.g. California Branch"}
                value={newLocationName}
                onChange={(e) => setNewLocationName(e.target.value)}
                className="w-full text-xs bg-white"
                autoFocus
              />
            </div>

            {/* Address fields (Only for physical location) */}
            {newLocationType === "physical" && (
              <div className="p-3.5 rounded-xl border border-slate-200 bg-white space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5" style={{ fontFamily: "DM Sans, sans-serif" }}>
                    <MapPin className="w-3.5 h-3.5 text-primary" />
                    Address
                  </span>
                  <span className="text-[11px] text-slate-500 flex items-center gap-1 bg-slate-50 px-2 py-0.5 rounded-md border border-slate-200">
                    <Lock className="w-3 h-3 text-slate-400" />
                    Country: <strong>{FIXED_ORG_COUNTRY}</strong> (Locked)
                  </span>
                </div>

                <div>
                  <label className="text-[11px] font-semibold text-slate-600 block mb-1">Street Address</label>
                  <Input
                    placeholder="e.g. 789 Medical Center Blvd, Suite 200"
                    value={newLocationAddress}
                    onChange={(e) => setNewLocationAddress(e.target.value)}
                    className="w-full text-xs"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  <div>
                    <label className="text-[11px] font-semibold text-slate-600 block mb-1">City</label>
                    <Input
                      placeholder="e.g. Austin"
                      value={newLocationCity}
                      onChange={(e) => setNewLocationCity(e.target.value)}
                      className="w-full text-xs"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-semibold text-slate-600 block mb-1">State / Province</label>
                    <Input
                      placeholder="e.g. TX"
                      value={newLocationState}
                      onChange={(e) => setNewLocationState(e.target.value)}
                      className="w-full text-xs"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-semibold text-slate-600 block mb-1">ZIP / Postal Code</label>
                    <Input
                      placeholder="e.g. 78701"
                      value={newLocationZip}
                      onChange={(e) => setNewLocationZip(e.target.value)}
                      className="w-full text-xs"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Available Time & Days Off for New Location */}
            <div className="border border-slate-200 rounded-xl overflow-hidden bg-white">
              {/* Header / Sub-tabs */}
              <div className="flex items-center justify-between p-3 border-b border-slate-100 bg-white">
                <div className="flex items-center gap-2">
                  <div className="flex items-center p-0.5 bg-slate-100 rounded-lg">
                    <button
                      type="button"
                      onClick={() => setNewLocationTab("hours")}
                      className={`px-3 py-1 text-xs font-semibold rounded-md transition-all cursor-pointer ${
                        newLocationTab === "hours" ? "bg-white text-slate-900 shadow-2xs" : "text-slate-500 hover:text-slate-800"
                      }`}
                    >
                      Working Hours
                    </button>
                    <button
                      type="button"
                      onClick={() => setNewLocationTab("days-off")}
                      className={`px-3 py-1 text-xs font-semibold rounded-md transition-all cursor-pointer ${
                        newLocationTab === "days-off" ? "bg-white text-slate-900 shadow-2xs" : "text-slate-500 hover:text-slate-800"
                      }`}
                    >
                      Days Off ({newLocationDaysOff.length})
                    </button>
                  </div>
                </div>

                {newLocationTab === "hours" && (
                  <button
                    type="button"
                    onClick={handleNewLocApplyWeekdayHours}
                    className="text-[11px] text-primary hover:underline font-semibold cursor-pointer hidden sm:inline"
                  >
                    Set Mon–Fri (9 AM – 5 PM)
                  </button>
                )}
              </div>

              {/* Working Hours Content */}
              {newLocationTab === "hours" && (
                <div className="p-3 bg-[#fbfcfd] space-y-1.5">
                  {DAYS_OF_WEEK.map(({ key, label }) => {
                    const sched = newLocationWorkingHours[key];
                    return (
                      <div
                        key={key}
                        className={`p-2 rounded-lg border flex items-center justify-between gap-2 text-xs transition-all ${
                          sched.enabled
                            ? "bg-white border-slate-200"
                            : "bg-slate-50 border-slate-200/50 opacity-60"
                        }`}
                      >
                        <label className="flex items-center gap-2 min-w-[100px] cursor-pointer">
                          <input
                            type="checkbox"
                            checked={sched.enabled}
                            onChange={(e) => handleNewLocToggleDay(key, e.target.checked)}
                            className="w-3.5 h-3.5 text-primary rounded border-slate-300 focus:ring-primary/20 cursor-pointer"
                          />
                          <span className={`font-semibold ${sched.enabled ? "text-slate-900" : "text-slate-500"}`}>
                            {label}
                          </span>
                        </label>

                        {sched.enabled ? (
                          <div className="flex items-center gap-1.5">
                            <input
                              type="time"
                              value={sched.start}
                              onChange={(e) => handleNewLocTimeChange(key, "start", e.target.value)}
                              className="px-1.5 py-0.5 text-xs bg-white border border-slate-200 rounded focus:outline-none focus:ring-1 focus:ring-primary font-medium text-slate-900"
                            />
                            <span className="text-slate-400 text-[11px]">to</span>
                            <input
                              type="time"
                              value={sched.end}
                              onChange={(e) => handleNewLocTimeChange(key, "end", e.target.value)}
                              className="px-1.5 py-0.5 text-xs bg-white border border-slate-200 rounded focus:outline-none focus:ring-1 focus:ring-primary font-medium text-slate-900"
                            />
                          </div>
                        ) : (
                          <span className="text-[11px] text-slate-400 italic">Closed</span>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Days Off Content */}
              {newLocationTab === "days-off" && (
                <div className="p-3 bg-[#fbfcfd] space-y-2">
                  <div className="space-y-1.5">
                    {newLocationDaysOff.length === 0 ? (
                      <div className="text-xs text-slate-400 py-2 text-center">No days off configured for this location</div>
                    ) : (
                      newLocationDaysOff.map((d) => (
                        <div key={d.id} className="p-2 rounded-lg border border-slate-200 bg-white flex items-center justify-between text-xs">
                          <div className="flex items-center gap-2">
                            <Calendar className="w-3.5 h-3.5 text-rose-500" />
                            <span className="font-semibold text-slate-900">{d.date}</span>
                            {d.label && <span className="text-slate-500">• {d.label}</span>}
                          </div>
                          <button
                            type="button"
                            onClick={() => setNewLocationDaysOff((prev) => prev.filter((x) => x.id !== d.id))}
                            className="text-slate-400 hover:text-rose-600 p-1 cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Bottom Actions */}
            <div className="pt-2 flex items-center justify-between border-t border-slate-200/60">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={newLocationIsPrimary}
                  onChange={(e) => setNewLocationIsPrimary(e.target.checked)}
                  className="w-3.5 h-3.5 text-primary rounded border-slate-300 focus:ring-primary"
                />
                <span className="text-xs font-medium text-slate-700">Set as Primary Location</span>
              </label>

              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setShowAddLocationInline(false)}
                  className="text-xs h-8 px-3"
                >
                  Cancel
                </Button>
                <Button
                  size="sm"
                  variant="primary"
                  onClick={handleCreateLocation}
                  className="text-xs h-8 px-3"
                >
                  <Plus className="w-3.5 h-3.5 mr-1" />
                  Save Location
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Locations List */}
      <div className="space-y-3">
        {locations.map((loc) => {
          const isExpanded = expandedLocationId === loc.id;
          const isLocOnline = loc.type === "online" || loc.name.toLowerCase() === "online";
          const subTab = activeLocSubTab[loc.id] || "hours";
          const locDaysOff = loc.daysOff || [];

          return (
            <div
              key={loc.id}
              className="border border-slate-200 rounded-2xl overflow-hidden bg-white shadow-2xs transition-all"
            >
              {/* Clean Minimal Location Header Row */}
              <div
                onClick={() => setExpandedLocationId(isExpanded ? null : loc.id)}
                className="p-4 flex items-center justify-between gap-3 bg-white hover:bg-slate-50/70 cursor-pointer transition-colors"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div
                    className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                      isLocOnline
                        ? "bg-blue-50 border border-blue-100 text-blue-600"
                        : "bg-slate-100 border border-slate-200 text-slate-700"
                    }`}
                  >
                    {isLocOnline ? <Video className="w-4 h-4" /> : <Building2 className="w-4 h-4" />}
                  </div>

                  <div className="flex items-center gap-2 min-w-0">
                    <span
                      className="text-sm font-bold text-slate-900 truncate"
                      style={{ fontFamily: "DM Sans, sans-serif" }}
                    >
                      {loc.name}
                    </span>

                    {isLocOnline ? (
                      <span className="px-2 py-0.5 text-[10px] font-semibold rounded-full bg-blue-50 text-blue-700 border border-blue-100">
                        Online
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 text-[10px] font-medium rounded-full bg-slate-100 text-slate-600 border border-slate-200">
                        Physical
                      </span>
                    )}

                    {loc.isPrimary && (
                      <span className="px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded-full bg-blue-100 text-blue-800">
                        Primary
                      </span>
                    )}
                  </div>
                </div>

                {/* Right Side Actions */}
                <div className="flex items-center gap-1.5 shrink-0" onClick={(e) => e.stopPropagation()}>
                  {locations.length > 1 && (
                    <button
                      type="button"
                      onClick={() => handleDeleteLocation(loc.id)}
                      className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                      title="Delete Location"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => setExpandedLocationId(isExpanded ? null : loc.id)}
                    className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg transition-colors cursor-pointer"
                    title={isExpanded ? "Collapse" : "Edit"}
                  >
                    <ChevronDown
                      className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${
                        isExpanded ? "rotate-180" : ""
                      }`}
                    />
                  </button>
                </div>
              </div>

              {/* Clean Expanded Content */}
              {isExpanded && (
                <div className="border-t border-slate-100 bg-[#fbfcfd] p-4 space-y-3.5">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {/* Location Name */}
                    <div>
                      <label className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 block mb-1">
                        Location Name
                      </label>
                      <Input
                        value={loc.name}
                        onChange={(e) => handleUpdateLocationField(loc.id, "name", e.target.value)}
                        placeholder={isLocOnline ? "Online" : "e.g. California Branch"}
                        className="w-full text-xs bg-white"
                      />
                    </div>

                    {/* Location Type */}
                    <div>
                      <label className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 block mb-1">
                        Location Type
                      </label>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => handleUpdateLocationField(loc.id, "type", "physical")}
                          className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer ${
                            !isLocOnline ? "bg-slate-900 text-white" : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"
                          }`}
                        >
                          <Building2 className="w-3.5 h-3.5" /> Physical Clinic
                        </button>
                        <button
                          type="button"
                          onClick={() => handleUpdateLocationField(loc.id, "type", "online")}
                          className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer ${
                            isLocOnline ? "bg-blue-600 text-white" : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"
                          }`}
                        >
                          <Video className="w-3.5 h-3.5" /> Online
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Physical Address Section — Only when not Online */}
                  {!isLocOnline ? (
                    <div className="p-3.5 rounded-xl border border-slate-200 bg-white space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5" style={{ fontFamily: "DM Sans, sans-serif" }}>
                          <MapPin className="w-3.5 h-3.5 text-primary" />
                          Address
                        </span>
                        <span className="text-[11px] text-slate-500 flex items-center gap-1 bg-slate-50 px-2 py-0.5 rounded-md border border-slate-200">
                          <Lock className="w-3 h-3 text-slate-400" />
                          Country: <strong>{FIXED_ORG_COUNTRY}</strong> (Locked)
                        </span>
                      </div>

                      <div>
                        <label className="text-[11px] font-semibold text-slate-600 block mb-1">Street Address</label>
                        <Input
                          value={loc.address}
                          onChange={(e) => handleUpdateLocationField(loc.id, "address", e.target.value)}
                          placeholder="e.g. 123 Healthcare Ave, Suite 100"
                          className="w-full text-xs"
                        />
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                        <div>
                          <label className="text-[11px] font-semibold text-slate-600 block mb-1">City</label>
                          <Input
                            value={loc.city || ""}
                            onChange={(e) => handleUpdateLocationField(loc.id, "city", e.target.value)}
                            placeholder="e.g. San Francisco"
                            className="w-full text-xs"
                          />
                        </div>
                        <div>
                          <label className="text-[11px] font-semibold text-slate-600 block mb-1">State / Province</label>
                          <Input
                            value={loc.state || ""}
                            onChange={(e) => handleUpdateLocationField(loc.id, "state", e.target.value)}
                            placeholder="e.g. CA"
                            className="w-full text-xs"
                          />
                        </div>
                        <div>
                          <label className="text-[11px] font-semibold text-slate-600 block mb-1">ZIP / Postal Code</label>
                          <Input
                            value={loc.zip || ""}
                            onChange={(e) => handleUpdateLocationField(loc.id, "zip", e.target.value)}
                            placeholder="e.g. 94102"
                            className="w-full text-xs"
                          />
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="p-3 rounded-xl border border-blue-100 bg-blue-50/30 flex items-center gap-2 text-xs text-blue-900">
                      <Video className="w-4 h-4 text-blue-600 shrink-0" />
                      <span>Online consultation location. No physical street address required.</span>
                    </div>
                  )}

                  {/* Available Time & Days Off for Existing Location */}
                  <div className="border border-slate-200 rounded-xl overflow-hidden bg-white">
                    <div className="flex items-center justify-between p-3 border-b border-slate-100 bg-white">
                      <div className="flex items-center gap-2">
                        <div className="flex items-center p-0.5 bg-slate-100 rounded-lg">
                          <button
                            type="button"
                            onClick={() => setActiveLocSubTab((prev) => ({ ...prev, [loc.id]: "hours" }))}
                            className={`px-3 py-1 text-xs font-semibold rounded-md transition-all cursor-pointer ${
                              subTab === "hours" ? "bg-white text-slate-900 shadow-2xs" : "text-slate-500 hover:text-slate-800"
                            }`}
                          >
                            Working Hours
                          </button>
                          <button
                            type="button"
                            onClick={() => setActiveLocSubTab((prev) => ({ ...prev, [loc.id]: "days-off" }))}
                            className={`px-3 py-1 text-xs font-semibold rounded-md transition-all cursor-pointer ${
                              subTab === "days-off" ? "bg-white text-slate-900 shadow-2xs" : "text-slate-500 hover:text-slate-800"
                            }`}
                          >
                            Days Off ({locDaysOff.length})
                          </button>
                        </div>
                      </div>

                      {subTab === "hours" ? (
                        <button
                          type="button"
                          onClick={() => handleApplyWeekdayHours(loc.id)}
                          className="text-[11px] text-primary hover:underline font-semibold cursor-pointer"
                        >
                          Set Mon–Fri (9 AM – 5 PM)
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => {
                            setAddingDayOffForLoc(loc.id);
                            setNewDayOffDate(new Date().toISOString().split("T")[0]);
                            setNewDayOffLabel("");
                          }}
                          className="flex items-center gap-1 text-[11px] text-primary hover:underline font-semibold cursor-pointer"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          Add Day Off
                        </button>
                      )}
                    </div>

                    {/* Sub-tab 1: Working Hours */}
                    {subTab === "hours" && (
                      <div className="p-3 bg-[#fbfcfd] space-y-1.5">
                        {DAYS_OF_WEEK.map(({ key, label }) => {
                          const sched = loc.workingHours[key];
                          return (
                            <div
                              key={key}
                              className={`p-2 rounded-lg border flex items-center justify-between gap-2 text-xs transition-all ${
                                sched.enabled
                                  ? "bg-white border-slate-200"
                                  : "bg-slate-50 border-slate-200/50 opacity-60"
                              }`}
                            >
                              <label className="flex items-center gap-2 min-w-[100px] cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={sched.enabled}
                                  onChange={(e) => handleToggleDay(loc.id, key, e.target.checked)}
                                  className="w-3.5 h-3.5 text-primary rounded border-slate-300 focus:ring-primary/20 cursor-pointer"
                                />
                                <span className={`font-semibold ${sched.enabled ? "text-slate-900" : "text-slate-500"}`}>
                                  {label}
                                </span>
                              </label>

                              {sched.enabled ? (
                                <div className="flex items-center gap-1.5">
                                  <input
                                    type="time"
                                    value={sched.start}
                                    onChange={(e) => handleTimeChange(loc.id, key, "start", e.target.value)}
                                    className="px-1.5 py-0.5 text-xs bg-white border border-slate-200 rounded focus:outline-none focus:ring-1 focus:ring-primary font-medium text-slate-900"
                                  />
                                  <span className="text-slate-400 text-[11px]">to</span>
                                  <input
                                    type="time"
                                    value={sched.end}
                                    onChange={(e) => handleTimeChange(loc.id, key, "end", e.target.value)}
                                    className="px-1.5 py-0.5 text-xs bg-white border border-slate-200 rounded focus:outline-none focus:ring-1 focus:ring-primary font-medium text-slate-900"
                                  />
                                </div>
                              ) : (
                                <span className="text-[11px] text-slate-400 italic">Closed</span>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {/* Sub-tab 2: Days Off */}
                    {subTab === "days-off" && (
                      <div className="p-3 bg-[#fbfcfd] space-y-2.5">
                        {/* Inline Add Day Off Form */}
                        {addingDayOffForLoc === loc.id && (
                          <div className="p-3 rounded-xl border border-blue-200 bg-blue-50/30 space-y-2">
                            <div className="text-xs font-bold text-slate-800">Add Location Day Off</div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                              <div>
                                <label className="text-[10px] font-semibold text-slate-600 block mb-0.5">Date *</label>
                                <input
                                  type="date"
                                  value={newDayOffDate}
                                  onChange={(e) => setNewDayOffDate(e.target.value)}
                                  className="w-full px-2 py-1 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-primary"
                                />
                              </div>
                              <div>
                                <label className="text-[10px] font-semibold text-slate-600 block mb-0.5">Reason / Holiday Name</label>
                                <input
                                  type="text"
                                  placeholder="e.g. Christmas Day, Renovation"
                                  value={newDayOffLabel}
                                  onChange={(e) => setNewDayOffLabel(e.target.value)}
                                  className="w-full px-2 py-1 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-primary"
                                />
                              </div>
                            </div>
                            <div className="flex items-center justify-end gap-2 pt-1">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => setAddingDayOffForLoc(null)}
                                className="h-7 px-2.5 text-xs"
                              >
                                Cancel
                              </Button>
                              <Button
                                size="sm"
                                variant="primary"
                                onClick={() => handleAddDayOff(loc.id)}
                                className="h-7 px-2.5 text-xs"
                              >
                                Add Day Off
                              </Button>
                            </div>
                          </div>
                        )}

                        {/* List of Days Off */}
                        <div className="space-y-1.5">
                          {locDaysOff.length === 0 ? (
                            <div className="text-xs text-slate-400 py-3 text-center">
                              No days off scheduled for {loc.name}. Click &quot;Add Day Off&quot; above to block dates.
                            </div>
                          ) : (
                            locDaysOff.map((d) => (
                              <div
                                key={d.id}
                                className="p-2.5 rounded-xl border border-slate-200 bg-white flex items-center justify-between text-xs hover:bg-slate-50 transition-colors shadow-2xs"
                              >
                                <div className="flex items-center gap-2.5 min-w-0">
                                  <div className="w-6 h-6 rounded-lg bg-rose-50 border border-rose-100 flex items-center justify-center text-rose-500 shrink-0">
                                    <Calendar className="w-3.5 h-3.5" />
                                  </div>
                                  <div className="truncate">
                                    <span className="font-bold text-slate-900 mr-2">{d.date}</span>
                                    <span className="text-slate-500 font-medium">{d.label || "Closed"}</span>
                                  </div>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => handleRemoveDayOff(loc.id, d.id)}
                                  className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer shrink-0 ml-2"
                                  title="Remove Day Off"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            ))
                          )}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Primary Location Toggle */}
                  <div className="pt-2 flex items-center justify-between border-t border-slate-200/60">
                    <label className="flex items-center gap-2 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={loc.isPrimary}
                        onChange={(e) => handleUpdateLocationField(loc.id, "isPrimary", e.target.checked)}
                        className="w-3.5 h-3.5 text-primary rounded border-slate-300 focus:ring-primary"
                      />
                      <span className="text-xs font-semibold text-slate-800">Set as Primary Location</span>
                    </label>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
