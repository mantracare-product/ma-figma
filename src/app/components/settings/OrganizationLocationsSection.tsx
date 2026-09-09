import React, { useState, useEffect } from "react";
import {
  MapPin,
  Clock,
  Calendar,
  CalendarOff,
  Plus,
  Trash2,
  ChevronDown,
  Check,
  X,
  Building2,
  Info,
  Phone,
  Globe,
  RotateCcw,
} from "lucide-react";
import { Button } from "../ui/Button";
import { Input } from "../ui/Input";
import { Tooltip } from "../ui/Tooltip";
import { toast } from "sonner";
import { Organization, useOrganization } from "../../context/OrganizationContext";
import { WeeklyAvailability, DaySchedule } from "../../pages/Settings";
import { createDefaultAvailability, TEXT_STYLES, TIMEZONES } from "../../pages/settings-constants";

export interface LocationDayOff {
  id: string;
  date: string; // YYYY-MM-DD
  label?: string;
}

export interface OrganizationLocationItem {
  id: string;
  name: string;
  address: string;
  phone?: string;
  timezone: string;
  isPrimary: boolean;
  workingHours: WeeklyAvailability;
  daysOff: LocationDayOff[];
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
        return JSON.parse(saved);
      }
    } catch (e) {
      console.error("Failed to parse locations from localStorage", e);
    }

    // Default seed locations based on active organization
    const orgLocs = activeOrganization.locations && activeOrganization.locations.length > 0
      ? activeOrganization.locations
      : [activeOrganization.location || "California"];

    return orgLocs.map((locName, idx) => ({
      id: `loc-${idx + 1}-${Date.now()}`,
      name: locName.includes("Center") || locName.includes("Clinic") || locName.includes("Branch")
        ? locName
        : `${locName} Branch`,
      address: idx === 0
        ? "123 Healthcare Ave, Suite 100, San Francisco, CA 94102"
        : "450 Lexington Ave, Suite 240, New York, NY 10017",
      phone: activeOrganization.phone || "+1 (555) 123-4567",
      timezone: idx === 0 ? "UTC-08:00 (Pacific Time)" : "UTC-05:00 (Eastern Time)",
      isPrimary: idx === 0,
      workingHours: createDefaultAvailability(),
      daysOff: [
        { id: `do-1-${idx}`, date: "2026-12-25", label: "Christmas Day" },
        { id: `do-2-${idx}`, date: "2027-01-01", label: "New Year's Day" },
      ],
    }));
  });

  // Keep track of which location card is expanded
  const [expandedLocationId, setExpandedLocationId] = useState<string | null>(() => locations[0]?.id || null);

  // Active sub-tab inside each location card ("hours" | "days-off")
  const [locationSubTab, setLocationSubTab] = useState<Record<string, "hours" | "days-off">>({});

  // Nested dropdown states inside each location card
  const [generalInfoOpenByLoc, setGeneralInfoOpenByLoc] = useState<Record<string, boolean>>({});
  const [availabilityOpenByLoc, setAvailabilityOpenByLoc] = useState<Record<string, boolean>>({});
  const [daysOffOpenByLoc, setDaysOffOpenByLoc] = useState<Record<string, boolean>>({});

  // Inline Add Location State
  const [showAddLocationInline, setShowAddLocationInline] = useState(false);
  const [newLocationName, setNewLocationName] = useState("");
  const [newLocationAddress, setNewLocationAddress] = useState("");
  const [newLocationPhone, setNewLocationPhone] = useState("");
  const [newLocationTimezone, setNewLocationTimezone] = useState("UTC-08:00 (Pacific Time)");
  const [newLocationIsPrimary, setNewLocationIsPrimary] = useState(false);


  // New Day Off draft input states keyed by locationId
  const [draftDateByLoc, setDraftDateByLoc] = useState<Record<string, string>>({});
  const [draftLabelByLoc, setDraftLabelByLoc] = useState<Record<string, string>>({});

  // Auto-sync storage whenever locations change
  useEffect(() => {
    try {
      localStorage.setItem(storageKey, JSON.stringify(locations));
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
        if (parsed.length > 0 && (!expandedLocationId || !parsed.some((l: OrganizationLocationItem) => l.id === expandedLocationId))) {
          setExpandedLocationId(parsed[0].id);
        }
      }
    } catch (e) {
      console.error("Failed to load organization locations", e);
    }
  }, [activeOrganization.id]);

  // Toggle day working hours for a location
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

  // Change working hour times for a location
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

  // Quick preset: Apply 9am-5pm to all weekdays
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
    toast.success("Applied 9:00 AM – 5:00 PM to Monday–Friday");
  };



  // Add Day Off to a location
  const handleAddDayOff = (locId: string) => {
    const date = draftDateByLoc[locId];
    const label = draftLabelByLoc[locId];
    if (!date) {
      toast.error("Please choose a date");
      return;
    }

    const loc = locations.find((l) => l.id === locId);
    if (loc?.daysOff.some((d) => d.date === date)) {
      toast.error("This date is already listed as a day off");
      return;
    }

    const newDay: LocationDayOff = {
      id: `do-${Date.now()}`,
      date,
      label: label?.trim() || undefined,
    };

    setLocations((prev) =>
      prev.map((l) => (l.id === locId ? { ...l, daysOff: [...l.daysOff, newDay].sort((a, b) => a.date.localeCompare(b.date)) } : l))
    );

    setDraftDateByLoc((prev) => ({ ...prev, [locId]: "" }));
    setDraftLabelByLoc((prev) => ({ ...prev, [locId]: "" }));
    toast.success("Day off added for location");
  };

  // Remove Day Off from a location
  const handleRemoveDayOff = (locId: string, dayOffId: string) => {
    setLocations((prev) =>
      prev.map((l) => (l.id === locId ? { ...l, daysOff: l.daysOff.filter((d) => d.id !== dayOffId) } : l))
    );
    toast.success("Day off removed");
  };



  // Create a new location inline
  const handleCreateLocation = () => {
    if (!newLocationName.trim()) {
      toast.error("Location name is required");
      return;
    }

    const newLoc: OrganizationLocationItem = {
      id: `loc-${Date.now()}`,
      name: newLocationName.trim(),
      address: newLocationAddress.trim() || "Address pending",
      phone: newLocationPhone.trim() || activeOrganization.phone || "",
      timezone: newLocationTimezone,
      isPrimary: newLocationIsPrimary || locations.length === 0,
      workingHours: createDefaultAvailability(),
      daysOff: [
        { id: `do-init-1`, date: "2026-12-25", label: "Christmas Day" },
        { id: `do-init-2`, date: "2027-01-01", label: "New Year's Day" },
      ],
    };

    let updated = [...locations, newLoc];
    if (newLocationIsPrimary) {
      updated = updated.map((l) => (l.id === newLoc.id ? l : { ...l, isPrimary: false }));
    }

    setLocations(updated);
    setExpandedLocationId(newLoc.id);
    setGeneralInfoOpenByLoc((prev) => ({ ...prev, [newLoc.id]: true }));

    // Also sync location names to OrganizationContext
    const locNames = updated.map((l) => l.name);
    updateOrganization(activeOrganization.id, {
      locations: locNames,
      location: updated.find((l) => l.isPrimary)?.name || locNames[0],
    });

    // Reset form
    setNewLocationName("");
    setNewLocationAddress("");
    setNewLocationPhone("");
    setNewLocationIsPrimary(false);
    setShowAddLocationInline(false);
    toast.success(`Added location "${newLoc.name}"`);
  };

  // Update location field inline
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

  // Delete a location
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
    // If we deleted the primary, make the first one primary
    if (locToDelete.isPrimary && updated.length > 0) {
      updated[0].isPrimary = true;
    }

    setLocations(updated);
    if (expandedLocationId === locId) {
      setExpandedLocationId(updated[0]?.id || null);
    }

    const locNames = updated.map((l) => l.name);
    updateOrganization(activeOrganization.id, {
      locations: locNames,
      location: updated.find((l) => l.isPrimary)?.name || locNames[0],
    });

    toast.success(`Removed location "${locToDelete.name}"`);
  };

  // Format 24h string to 12h AM/PM
  const formatHour = (timeStr?: string) => {
    if (!timeStr) return "";
    const [h, m] = timeStr.split(":").map(Number);
    if (isNaN(h)) return timeStr;
    const period = h >= 12 ? "PM" : "AM";
    const hour = h % 12 === 0 ? 12 : h % 12;
    return `${hour}:${String(m || 0).padStart(2, "0")} ${period}`;
  };

  return (
    <div className="bg-white/90 rounded-[20px] p-6 border border-slate-200/70 shadow-2xs space-y-5">
      {/* Section Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
        <div className="flex items-center gap-2">
          <h3 className="font-bold text-xs uppercase tracking-wider font-display text-slate-500">
            ORGANIZATION LOCATIONS
          </h3>
          <Tooltip text="Manage branches, physical centers, specific working hours, and days off for each location">
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
          onClick={() => setShowAddLocationInline(true)}
          className="flex items-center gap-1.5 self-start sm:self-auto font-semibold border-primary/30 text-primary hover:bg-primary/5"
        >
          <Plus className="w-4 h-4" />
          Add Location
        </Button>
      </div>

      {/* Locations List */}
      <div className="space-y-4">
        {locations.map((loc) => {
          const isExpanded = expandedLocationId === loc.id;
          const isGeneralInfoOpen = generalInfoOpenByLoc[loc.id] !== false;
          const isAvailOpen = availabilityOpenByLoc[loc.id] !== false;
          const isDaysOffOpen = daysOffOpenByLoc[loc.id] === true;
          const isLocEditing = isEditing;

          return (
            <div
              key={loc.id}
              className="border border-slate-200/80 rounded-2xl overflow-hidden bg-white shadow-xs transition-all"
            >
              {/* Card Header Bar */}
              <div
                onClick={() => setExpandedLocationId(isExpanded ? null : loc.id)}
                className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white hover:bg-slate-50/70 cursor-pointer transition-colors"
              >
                <div className="flex items-start sm:items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-primary shrink-0 mt-0.5 sm:mt-0">
                    <MapPin className="w-5 h-5" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h4
                        className="text-base font-bold text-slate-900 truncate"
                        style={{ fontFamily: "DM Sans, sans-serif" }}
                      >
                        {loc.name}
                      </h4>
                      {loc.isPrimary && (
                        <span className="px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded-full bg-blue-100 text-blue-800">
                          Primary
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Right Side Actions */}
                <div className="flex items-center gap-2 self-end sm:self-auto shrink-0" onClick={(e) => e.stopPropagation()}>
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
                    title={isExpanded ? "Collapse" : "Expand"}
                  >
                    <ChevronDown
                      className={`w-5 h-5 text-slate-400 transition-transform duration-200 ${
                        isExpanded ? "rotate-180" : ""
                      }`}
                    />
                  </button>
                </div>
              </div>

              {/* Expanded Location Details: General Info, Availability & Days Off Dropdowns */}
              {isExpanded && (
                <div className="border-t border-slate-100 bg-[#fbfcfd] p-4 sm:p-5 space-y-4">
                  {/* DROPDOWN: General Info */}
                  <div className="border border-slate-200/80 rounded-xl overflow-hidden bg-white shadow-2xs">
                    <button
                      type="button"
                      onClick={() =>
                        setGeneralInfoOpenByLoc((prev) => ({
                          ...prev,
                          [loc.id]: prev[loc.id] !== undefined ? !prev[loc.id] : false,
                        }))
                      }
                      className="w-full flex items-center justify-between p-3.5 bg-white hover:bg-slate-50/70 transition-colors text-left cursor-pointer"
                    >
                      <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-lg bg-blue-50 border border-blue-100 flex items-center justify-center text-primary shrink-0">
                          <Building2 className="w-3.5 h-3.5" />
                        </div>
                        <span
                          className="text-xs font-bold text-slate-900"
                          style={{ fontFamily: "DM Sans, sans-serif" }}
                        >
                          General Info
                        </span>
                        <Tooltip text="Branch address, contact phone, and timezone settings">
                          <Info className="w-3.5 h-3.5 text-slate-400 hover:text-slate-600 transition-colors cursor-pointer" />
                        </Tooltip>
                      </div>

                      <div className="flex items-center gap-2.5">
                        <ChevronDown
                          className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${
                            isGeneralInfoOpen ? "rotate-180" : ""
                          }`}
                        />
                      </div>
                    </button>

                    {isGeneralInfoOpen && (
                      <div className="p-3.5 border-t border-slate-100 bg-[#fbfcfd]">
                        {isLocEditing ? (
                          <div className="space-y-3">
                            {/* Location Name */}
                            <div className="w-full p-3 rounded-xl border border-blue-200/80 bg-white shadow-2xs">
                              <label className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 block mb-1.5">
                                Location Name
                              </label>
                              <Input
                                value={loc.name}
                                onChange={(e) => handleUpdateLocationField(loc.id, "name", e.target.value)}
                                placeholder="e.g. Downtown Clinic"
                                className="w-full text-xs"
                              />
                            </div>

                            {/* Address */}
                            <div className="w-full p-3 rounded-xl border border-blue-200/80 bg-white shadow-2xs">
                              <label className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 flex items-center gap-1 mb-1.5">
                                <MapPin className="w-3.5 h-3.5 text-primary" />
                                Address
                              </label>
                              <Input
                                value={loc.address}
                                onChange={(e) => handleUpdateLocationField(loc.id, "address", e.target.value)}
                                placeholder="e.g. 123 Healthcare Ave, Suite 100"
                                className="w-full text-xs"
                              />
                            </div>

                            {/* Phone */}
                            <div className="w-full p-3 rounded-xl border border-blue-200/80 bg-white shadow-2xs">
                              <label className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 flex items-center gap-1 mb-1.5">
                                <Phone className="w-3.5 h-3.5 text-primary" />
                                Phone Number
                              </label>
                              <Input
                                value={loc.phone || ""}
                                onChange={(e) => handleUpdateLocationField(loc.id, "phone", e.target.value)}
                                placeholder="e.g. +1 (555) 123-4567"
                                className="w-full text-xs"
                              />
                            </div>

                            {/* Timezone */}
                            <div className="w-full p-3 rounded-xl border border-blue-200/80 bg-white shadow-2xs">
                              <label className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 flex items-center gap-1 mb-1.5">
                                <Globe className="w-3.5 h-3.5 text-primary" />
                                Timezone
                              </label>
                              <select
                                value={loc.timezone}
                                onChange={(e) => handleUpdateLocationField(loc.id, "timezone", e.target.value)}
                                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-primary bg-white text-slate-900"
                              >
                                {TIMEZONES.map((tz) => (
                                  <option key={tz} value={tz}>
                                    {tz}
                                  </option>
                                ))}
                              </select>
                            </div>

                            {/* Primary Toggle */}
                            <div className="pt-1 flex items-center justify-between">
                              <label className="flex items-center gap-2 cursor-pointer select-none">
                                <input
                                  type="checkbox"
                                  checked={loc.isPrimary}
                                  onChange={(e) => handleUpdateLocationField(loc.id, "isPrimary", e.target.checked)}
                                  className="w-4 h-4 text-primary rounded border-slate-300 focus:ring-primary"
                                />
                                <span className="text-xs font-medium text-slate-800">Set as Primary Location</span>
                              </label>
                            </div>
                          </div>
                        ) : (
                          <div className="flex flex-col gap-2.5">
                            {/* Address */}
                            <div className="w-full p-3 rounded-xl border border-slate-200/80 bg-white shadow-2xs">
                              <div className="flex items-center gap-1.5 text-slate-400 mb-1">
                                <MapPin className="w-3.5 h-3.5 text-primary" />
                                <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                                  Address
                                </span>
                              </div>
                              <p className="text-xs font-medium text-slate-900" style={{ fontFamily: "Outfit, sans-serif" }}>
                                {loc.address || "No address provided"}
                              </p>
                            </div>

                            {/* Phone */}
                            <div className="w-full p-3 rounded-xl border border-slate-200/80 bg-white shadow-2xs">
                              <div className="flex items-center gap-1.5 text-slate-400 mb-1">
                                <Phone className="w-3.5 h-3.5 text-primary" />
                                <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                                  Phone Number
                                </span>
                              </div>
                              <p className="text-xs font-medium text-slate-900" style={{ fontFamily: "Outfit, sans-serif" }}>
                                {loc.phone || "No phone number"}
                              </p>
                            </div>

                            {/* Timezone */}
                            <div className="w-full p-3 rounded-xl border border-slate-200/80 bg-white shadow-2xs">
                              <div className="flex items-center gap-1.5 text-slate-400 mb-1">
                                <Globe className="w-3.5 h-3.5 text-primary" />
                                <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                                  Timezone
                                </span>
                              </div>
                              <p className="text-xs font-medium text-slate-900" style={{ fontFamily: "Outfit, sans-serif" }}>
                                {loc.timezone}
                              </p>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* DROPDOWN 2: Availability */}
                  <div className="border border-slate-200/80 rounded-xl overflow-hidden bg-white shadow-2xs">
                    <button
                      type="button"
                      onClick={() =>
                        setAvailabilityOpenByLoc((prev) => ({
                          ...prev,
                          [loc.id]: prev[loc.id] !== undefined ? !prev[loc.id] : false,
                        }))
                      }
                      className="w-full flex items-center justify-between p-3.5 bg-white hover:bg-slate-50/70 transition-colors text-left cursor-pointer"
                    >
                      <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-lg bg-blue-50 border border-blue-100 flex items-center justify-center text-primary shrink-0">
                          <Clock className="w-3.5 h-3.5" />
                        </div>
                        <span
                          className="text-xs font-bold text-slate-900"
                          style={{ fontFamily: "DM Sans, sans-serif" }}
                        >
                          Availability
                        </span>
                        <Tooltip text="Weekly working hours when staff and AI receptionists are available at this location">
                          <Info className="w-3.5 h-3.5 text-slate-400 hover:text-slate-600 transition-colors cursor-pointer" />
                        </Tooltip>
                      </div>

                      <div className="flex items-center gap-3">
                        <div
                          className="hidden sm:flex items-center gap-2 text-xs"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <button
                            type="button"
                            onClick={() => handleApplyWeekdayHours(loc.id)}
                            className="text-primary hover:underline font-medium cursor-pointer"
                          >
                            9 AM – 5 PM (Mon–Fri)
                          </button>

                        </div>

                        <ChevronDown
                          className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${
                            isAvailOpen ? "rotate-180" : ""
                          }`}
                        />
                      </div>
                    </button>

                    {isAvailOpen && (
                      <div className="p-3.5 border-t border-slate-100 bg-[#fbfcfd] space-y-2">
                        <div className="grid grid-cols-1 gap-2">
                          {DAYS_OF_WEEK.map(({ key, label }) => {
                            const sched = loc.workingHours[key];
                            return (
                              <div
                                key={key}
                                className={`p-2.5 sm:p-3 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 transition-all ${
                                  sched.enabled
                                    ? "bg-white border-slate-200 shadow-2xs"
                                    : "bg-slate-50/70 border-slate-200/60 opacity-80"
                                }`}
                              >
                                <label className="flex items-center gap-2.5 min-w-[120px] cursor-pointer">
                                  <input
                                    type="checkbox"
                                    checked={sched.enabled}
                                    onChange={(e) => handleToggleDay(loc.id, key, e.target.checked)}
                                    className="w-4 h-4 text-primary rounded border-slate-300 focus:ring-primary/20 cursor-pointer"
                                  />
                                  <span
                                    className={`text-xs font-semibold ${
                                      sched.enabled ? "text-slate-900" : "text-slate-500"
                                    }`}
                                    style={{ fontFamily: "DM Sans, sans-serif" }}
                                  >
                                    {label}
                                  </span>
                                </label>

                                {sched.enabled ? (
                                  <div className="flex items-center gap-2 flex-1 sm:justify-end">
                                    <div className="flex items-center gap-1.5">
                                      <Clock className="w-3.5 h-3.5 text-slate-400" />
                                      <input
                                        type="time"
                                        value={sched.start}
                                        onChange={(e) => handleTimeChange(loc.id, key, "start", e.target.value)}
                                        className="px-2 py-1 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary font-medium text-slate-900"
                                        style={{ fontFamily: "Outfit, sans-serif" }}
                                      />
                                    </div>
                                    <span className="text-xs text-slate-400">to</span>
                                    <input
                                      type="time"
                                      value={sched.end}
                                      onChange={(e) => handleTimeChange(loc.id, key, "end", e.target.value)}
                                      className="px-2 py-1 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary font-medium text-slate-900"
                                      style={{ fontFamily: "Outfit, sans-serif" }}
                                    />
                                    <span
                                      className="text-[11px] text-slate-500 font-medium hidden md:inline-block ml-1.5 w-28 text-right"
                                      style={{ fontFamily: "Outfit, sans-serif" }}
                                    >
                                      ({formatHour(sched.start)} – {formatHour(sched.end)})
                                    </span>
                                  </div>
                                ) : (
                                  <span
                                    className="text-[11px] font-medium text-slate-400 italic px-2 py-0.5 rounded bg-slate-100 w-fit"
                                    style={{ fontFamily: "Outfit, sans-serif" }}
                                  >
                                    Closed / Unavailable
                                  </span>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* DROPDOWN 2: Days Off */}
                  <div className="border border-slate-200/80 rounded-xl overflow-hidden bg-white shadow-2xs">
                    <button
                      type="button"
                      onClick={() =>
                        setDaysOffOpenByLoc((prev) => ({
                          ...prev,
                          [loc.id]: prev[loc.id] !== undefined ? !prev[loc.id] : true,
                        }))
                      }
                      className="w-full flex items-center justify-between p-3.5 bg-white hover:bg-slate-50/70 transition-colors text-left cursor-pointer"
                    >
                      <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-lg bg-blue-50 border border-blue-100 flex items-center justify-center text-primary shrink-0">
                          <CalendarOff className="w-3.5 h-3.5" />
                        </div>
                        <span
                          className="text-xs font-bold text-slate-900"
                          style={{ fontFamily: "DM Sans, sans-serif" }}
                        >
                          Days Off
                        </span>
                        <Tooltip text="Specific dates, closures, and holidays when this location is closed">
                          <Info className="w-3.5 h-3.5 text-slate-400 hover:text-slate-600 transition-colors cursor-pointer" />
                        </Tooltip>
                      </div>

                      <div className="flex items-center gap-3">

                        <ChevronDown
                          className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${
                            isDaysOffOpen ? "rotate-180" : ""
                          }`}
                        />
                      </div>
                    </button>

                    {isDaysOffOpen && (
                      <div className="p-3.5 border-t border-slate-100 bg-[#fbfcfd] space-y-3">
                        {/* Add Day Off Form */}
                        <div className="p-3 rounded-xl border border-slate-200 bg-white space-y-2.5">
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                            <div>
                              <span className="text-[11px] text-slate-500 block mb-1">Select Date</span>
                              <input
                                type="date"
                                value={draftDateByLoc[loc.id] || ""}
                                onChange={(e) => setDraftDateByLoc({ ...draftDateByLoc, [loc.id]: e.target.value })}
                                min={new Date().toISOString().split("T")[0]}
                                className="w-full px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary text-slate-900"
                              />
                            </div>
                            <div>
                              <span className="text-[11px] text-slate-500 block mb-1">Holiday / Reason (Optional)</span>
                              <input
                                type="text"
                                placeholder="e.g. Labor Day, Renovation"
                                value={draftLabelByLoc[loc.id] || ""}
                                onChange={(e) => setDraftLabelByLoc({ ...draftLabelByLoc, [loc.id]: e.target.value })}
                                className="w-full px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary text-slate-900"
                                style={{ fontFamily: "Outfit, sans-serif" }}
                              />
                            </div>
                          </div>

                          <div className="flex justify-end gap-2">
                            <Button
                              variant="primary"
                              size="sm"
                              onClick={() => handleAddDayOff(loc.id)}
                              className="flex items-center gap-1.5 font-semibold text-xs py-1"
                            >
                              <Plus className="w-3.5 h-3.5" />
                              Add Day Off
                            </Button>
                          </div>
                        </div>

                        {/* Scheduled Days Off List */}
                        {loc.daysOff.length > 0 ? (
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            {loc.daysOff.map((day) => {
                              const dateObj = new Date(day.date + "T00:00:00");
                              const formatted = !isNaN(dateObj.getTime())
                                ? dateObj.toLocaleDateString("en-US", {
                                    weekday: "short",
                                    month: "short",
                                    day: "numeric",
                                    year: "numeric",
                                  })
                                : day.date;

                              return (
                                <div
                                  key={day.id}
                                  className="flex items-center justify-between p-2.5 px-3 rounded-xl border border-slate-200 bg-white shadow-2xs text-xs"
                                >
                                  <div className="flex items-center gap-2 min-w-0">
                                    <Calendar className="w-3.5 h-3.5 text-primary shrink-0" />
                                    <div className="min-w-0">
                                      <div
                                        className="font-semibold text-slate-900 truncate"
                                        style={{ fontFamily: "Outfit, sans-serif" }}
                                      >
                                        {formatted}
                                      </div>
                                      {day.label && (
                                        <span className="text-[11px] text-slate-500 truncate block">
                                          {day.label}
                                        </span>
                                      )}
                                    </div>
                                  </div>

                                  <button
                                    type="button"
                                    onClick={() => handleRemoveDayOff(loc.id, day.id)}
                                    className="p-1 text-slate-400 hover:text-slate-700 rounded-lg transition-colors cursor-pointer shrink-0 ml-2"
                                    title="Remove day off"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              );
                            })}
                          </div>
                        ) : (
                          <div className="text-center py-5 border border-dashed border-slate-200 rounded-xl bg-white/50">
                            <CalendarOff className="w-6 h-6 text-slate-400 mx-auto mb-1.5" />
                            <p className="text-xs text-slate-500 font-medium">No days off added for this location</p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Add New Location Card (opened by top header Add Location button) */}
      {showAddLocationInline && (
        <div className="border-2 border-primary/30 rounded-2xl p-5 bg-white shadow-xs space-y-4 transition-all animate-in fade-in duration-200">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-primary">
                <Plus className="w-4 h-4" />
              </div>
              <h4 className="text-sm font-bold text-slate-900" style={{ fontFamily: "DM Sans, sans-serif" }}>
                Add New Location
              </h4>
              <Tooltip text="Create a new physical center or branch with dedicated schedule">
                <Info className="w-3.5 h-3.5 text-slate-400 hover:text-slate-600 transition-colors cursor-pointer" />
              </Tooltip>
            </div>
            <button
              type="button"
              onClick={() => setShowAddLocationInline(false)}
              className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
              title="Cancel"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="space-y-3">
            <div>
              <label className="text-xs font-semibold flex items-center gap-1 text-slate-700 mb-1">
                Location Name *
              </label>
              <Input
                placeholder="e.g. Downtown Clinic, Chicago Branch"
                value={newLocationName}
                onChange={(e) => setNewLocationName(e.target.value)}
                className="w-full text-xs"
                autoFocus
              />
            </div>

            <div>
              <label className="text-xs font-semibold flex items-center gap-1 text-slate-700 mb-1">
                Address
              </label>
              <Input
                placeholder="e.g. 789 Medical Center Blvd, Suite 200, Austin, TX 78701"
                value={newLocationAddress}
                onChange={(e) => setNewLocationAddress(e.target.value)}
                className="w-full text-xs"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold flex items-center gap-1 text-slate-700 mb-1">
                  Phone Number
                </label>
                <Input
                  placeholder="e.g. +1 (555) 000-0000"
                  value={newLocationPhone}
                  onChange={(e) => setNewLocationPhone(e.target.value)}
                  className="w-full text-xs"
                />
              </div>

              <div>
                <label className="text-xs font-semibold flex items-center gap-1 text-slate-700 mb-1">
                  Timezone
                </label>
                <select
                  value={newLocationTimezone}
                  onChange={(e) => setNewLocationTimezone(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-primary bg-white text-slate-900"
                >
                  {TIMEZONES.map((tz) => (
                    <option key={tz} value={tz}>
                      {tz}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="pt-2 flex items-center justify-between border-t border-slate-100">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={newLocationIsPrimary}
                  onChange={(e) => setNewLocationIsPrimary(e.target.checked)}
                  className="w-4 h-4 text-primary rounded border-slate-300 focus:ring-primary"
                />
                <span className="text-xs font-medium text-slate-800">Set as Primary Location</span>
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
    </div>
  );
}
