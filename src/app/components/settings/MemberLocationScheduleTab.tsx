import React, { useState, useEffect } from "react";
import {
  MapPin,
  Clock,
  Calendar,
  CalendarOff,
  Plus,
  Trash2,
  Check,
  Building2,
  Info,
  ChevronDown,
  CalendarClock,
  Sparkles,
  AlertCircle,
} from "lucide-react";
import { Button } from "../ui/Button";
import { toast } from "sonner";
import { useOrganization } from "../../context/OrganizationContext";
import { WeeklyAvailability } from "../../pages/Settings";
import { createDefaultAvailability, TEXT_STYLES } from "../../pages/settings-constants";

export interface MemberLocationDayOff {
  id: string | number;
  date: string; // YYYY-MM-DD or formatted
  duration: string; // "All Day" | "Morning (Until 1 PM)" | "Afternoon (After 1 PM)"
  reason?: string;
}

export interface MemberLocationSchedule {
  locationId: string;
  locationName: string;
  isAvailableAtLocation: boolean;
  workingHours: WeeklyAvailability;
  daysOff: MemberLocationDayOff[];
}

const WEEKDAYS: Array<{ key: keyof WeeklyAvailability; label: string; short: string }> = [
  { key: "monday", label: "Monday", short: "Mon" },
  { key: "tuesday", label: "Tuesday", short: "Tue" },
  { key: "wednesday", label: "Wednesday", short: "Wed" },
  { key: "thursday", label: "Thursday", short: "Thu" },
  { key: "friday", label: "Friday", short: "Fri" },
  { key: "saturday", label: "Saturday", short: "Sat" },
  { key: "sunday", label: "Sunday", short: "Sun" },
];

interface MemberLocationScheduleTabProps {
  memberId?: string | number;
  memberName?: string;
  onSave?: (schedules: Record<string, MemberLocationSchedule>) => void;
}

export default function MemberLocationScheduleTab({
  memberId = "default",
  memberName = "Team Member",
  onSave,
}: MemberLocationScheduleTabProps) {
  const { activeOrganization } = useOrganization();

  // 1. Load organization locations
  const [orgLocations, setOrgLocations] = useState<Array<{ id: string; name: string; address?: string }>>(() => {
    try {
      const saved = localStorage.getItem(`mantra_org_locations_${activeOrganization.id}`);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed.map((l: any) => ({
            id: l.id,
            name: l.name,
            address: l.address,
          }));
        }
      }
    } catch (e) {
      console.error(e);
    }

    // Fallback to active organization locations list
    const locNames = activeOrganization.locations && activeOrganization.locations.length > 0
      ? activeOrganization.locations
      : [activeOrganization.location || "California"];

    return locNames.map((name, idx) => ({
      id: `loc-${idx + 1}`,
      name: name.includes("Center") || name.includes("Clinic") || name.includes("Branch") ? name : `${name} Branch`,
      address: idx === 0 ? "San Francisco Main Clinic" : "New York Medical Suite",
    }));
  });

  // Storage key for this member's location schedules
  const storageKey = `mantra_member_loc_schedules_${memberId}_${activeOrganization.id}`;

  // 2. Member schedule map per location
  const [schedules, setSchedules] = useState<Record<string, MemberLocationSchedule>>(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        return JSON.parse(saved);
      }
    } catch (e) {
      console.error(e);
    }

    // Initial default: doctor is available at first location by default, or all locations
    const initial: Record<string, MemberLocationSchedule> = {};
    orgLocations.forEach((loc, idx) => {
      initial[loc.id] = {
        locationId: loc.id,
        locationName: loc.name,
        isAvailableAtLocation: true,
        workingHours: idx === 0
          ? createDefaultAvailability()
          : {
              monday: { enabled: false, start: "09:00", end: "17:00" },
              tuesday: { enabled: true, start: "09:00", end: "17:00" },
              wednesday: { enabled: false, start: "09:00", end: "17:00" },
              thursday: { enabled: true, start: "09:00", end: "17:00" },
              friday: { enabled: false, start: "09:00", end: "17:00" },
              saturday: { enabled: false, start: "10:00", end: "14:00" },
              sunday: { enabled: false, start: "10:00", end: "14:00" },
            },
        daysOff: [
          { id: `do-1-${idx}`, date: "2026-12-25", duration: "All Day", reason: "Christmas Day" },
          { id: `do-2-${idx}`, date: "2027-01-01", duration: "All Day", reason: "New Year's Day" },
        ],
      };
    });
    return initial;
  });

  // Selected location ID being viewed/edited
  const [activeLocId, setActiveLocId] = useState<string>(() => orgLocations[0]?.id || "loc-1");

  // Sub-view within the selected location: "hours" | "days-off"
  const [activeSubTab, setActiveSubTab] = useState<"hours" | "days-off">("hours");

  // Add day off draft form states for active location
  const [draftDate, setDraftDate] = useState("");
  const [draftDuration, setDraftDuration] = useState("All Day");
  const [draftReason, setDraftReason] = useState("");

  // Show multi-location overview banner
  const [showOverview, setShowOverview] = useState(true);

  // Sync to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(storageKey, JSON.stringify(schedules));
      if (onSave) {
        onSave(schedules);
      }
    } catch (e) {
      console.error(e);
    }
  }, [schedules, storageKey, onSave]);

  // Ensure every org location has an entry in schedules
  useEffect(() => {
    setSchedules((prev) => {
      const updated = { ...prev };
      let changed = false;
      orgLocations.forEach((loc) => {
        if (!updated[loc.id]) {
          updated[loc.id] = {
            locationId: loc.id,
            locationName: loc.name,
            isAvailableAtLocation: false,
            workingHours: createDefaultAvailability(),
            daysOff: [],
          };
          changed = true;
        }
      });
      return changed ? updated : prev;
    });
  }, [orgLocations]);

  const currentSchedule = schedules[activeLocId] || {
    locationId: activeLocId,
    locationName: orgLocations.find((l) => l.id === activeLocId)?.name || "Location",
    isAvailableAtLocation: true,
    workingHours: createDefaultAvailability(),
    daysOff: [],
  };

  // Toggle availability at location
  const handleToggleLocationActive = (active: boolean) => {
    setSchedules((prev) => ({
      ...prev,
      [activeLocId]: {
        ...currentSchedule,
        isAvailableAtLocation: active,
      },
    }));
    toast.success(
      active
        ? `${memberName} is now active at ${currentSchedule.locationName}`
        : `${memberName} set to inactive at ${currentSchedule.locationName}`
    );
  };

  // Toggle day working hours
  const handleToggleDay = (dayKey: keyof WeeklyAvailability, enabled: boolean) => {
    setSchedules((prev) => ({
      ...prev,
      [activeLocId]: {
        ...currentSchedule,
        workingHours: {
          ...currentSchedule.workingHours,
          [dayKey]: {
            ...currentSchedule.workingHours[dayKey],
            enabled,
          },
        },
      },
    }));
  };

  // Change working hour times
  const handleTimeChange = (dayKey: keyof WeeklyAvailability, field: "start" | "end", value: string) => {
    setSchedules((prev) => ({
      ...prev,
      [activeLocId]: {
        ...currentSchedule,
        workingHours: {
          ...currentSchedule.workingHours,
          [dayKey]: {
            ...currentSchedule.workingHours[dayKey],
            [field]: value,
          },
        },
      },
    }));
  };

  // Apply 9-5 weekday preset for this location
  const handleApplyWeekdayHours = () => {
    setSchedules((prev) => {
      const updatedHours = { ...currentSchedule.workingHours };
      (["monday", "tuesday", "wednesday", "thursday", "friday"] as Array<keyof WeeklyAvailability>).forEach((d) => {
        updatedHours[d] = { enabled: true, start: "09:00", end: "17:00" };
      });
      return {
        ...prev,
        [activeLocId]: {
          ...currentSchedule,
          workingHours: updatedHours,
        },
      };
    });
    toast.success(`Applied 9:00 AM – 5:00 PM (Mon–Fri) for ${currentSchedule.locationName}`);
  };

  // Clear all working hours for this location
  const handleClearHours = () => {
    setSchedules((prev) => {
      const updatedHours = { ...currentSchedule.workingHours };
      WEEKDAYS.forEach(({ key }) => {
        updatedHours[key] = { ...updatedHours[key], enabled: false };
      });
      return {
        ...prev,
        [activeLocId]: {
          ...currentSchedule,
          workingHours: updatedHours,
        },
      };
    });
    toast.info(`Cleared working hours for ${currentSchedule.locationName}`);
  };

  // Add Day Off for this location
  const handleAddDayOff = () => {
    if (!draftDate) {
      toast.error("Please choose a date for the day off");
      return;
    }

    if (currentSchedule.daysOff.some((d) => d.date === draftDate)) {
      toast.error("This date is already added as a day off for this location");
      return;
    }

    const newDay: MemberLocationDayOff = {
      id: `do-${Date.now()}`,
      date: draftDate,
      duration: draftDuration,
      reason: draftReason.trim() || undefined,
    };

    setSchedules((prev) => ({
      ...prev,
      [activeLocId]: {
        ...currentSchedule,
        daysOff: [...currentSchedule.daysOff, newDay].sort((a, b) => String(a.date).localeCompare(String(b.date))),
      },
    }));

    setDraftDate("");
    setDraftReason("");
    toast.success(`Added day off for ${currentSchedule.locationName}`);
  };

  // Remove Day Off from this location
  const handleRemoveDayOff = (dayId: string | number) => {
    setSchedules((prev) => ({
      ...prev,
      [activeLocId]: {
        ...currentSchedule,
        daysOff: currentSchedule.daysOff.filter((d) => d.id !== dayId),
      },
    }));
    toast.success("Day off removed");
  };

  // Format 24h string to 12h AM/PM
  const formatTimeStr = (t?: string) => {
    if (!t) return "";
    const [h, m] = t.split(":").map(Number);
    if (isNaN(h)) return t;
    const period = h >= 12 ? "PM" : "AM";
    const hour = h % 12 === 0 ? 12 : h % 12;
    return `${hour}:${String(m || 0).padStart(2, "0")} ${period}`;
  };

  const activeLocationsCount = Object.values(schedules).filter((s) => s.isAvailableAtLocation).length;

  return (
    <div className="space-y-6">
      {/* Header Info */}
      <div className="pb-4 border-b border-slate-200/80">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h3 className="text-base font-bold text-slate-900" style={TEXT_STYLES.heading}>
              Location-Specific Availability & Days Off
            </h3>
            <p className="text-xs text-slate-500 mt-0.5" style={TEXT_STYLES.subtext}>
              {memberName} can be available across multiple organization locations with independent working hours and days off.
            </p>
          </div>
          <span
            className="px-2.5 py-1 text-xs font-semibold rounded-full bg-blue-50 text-blue-700 border border-blue-200 self-start sm:self-auto"
            style={{ fontFamily: "Outfit, sans-serif" }}
          >
            Active at {activeLocationsCount} of {orgLocations.length} Locations
          </span>
        </div>
      </div>

      {/* Cross-Location Schedule Overview (At A Glance) */}
      <div className="border border-slate-200/80 rounded-2xl bg-white shadow-xs overflow-hidden">
        <button
          type="button"
          onClick={() => setShowOverview(!showOverview)}
          className="w-full flex items-center justify-between p-3.5 px-4 bg-slate-50/70 hover:bg-slate-100/70 transition-colors text-left cursor-pointer"
        >
          <div className="flex items-center gap-2">
            <CalendarClock className="w-4 h-4 text-blue-600" />
            <span className="text-xs font-bold text-slate-900 uppercase tracking-wider font-display">
              Weekly Multi-Location Schedule (At a Glance)
            </span>
          </div>
          <ChevronDown
            className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${
              showOverview ? "rotate-180" : ""
            }`}
          />
        </button>

        {showOverview && (
          <div className="p-4 border-t border-slate-100 grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2">
            {WEEKDAYS.map(({ key, short, label }) => {
              // Find which locations this member works at on this day
              const workingAtLocs = Object.values(schedules).filter(
                (s) => s.isAvailableAtLocation && s.workingHours[key]?.enabled
              );

              return (
                <div
                  key={key}
                  className={`p-2.5 rounded-xl border text-center transition-all ${
                    workingAtLocs.length > 0
                      ? "bg-blue-50/40 border-blue-200/80"
                      : "bg-slate-50 border-slate-200/60 opacity-60"
                  }`}
                >
                  <span className="text-[11px] font-bold text-slate-800 uppercase block font-display">
                    {short}
                  </span>
                  {workingAtLocs.length > 0 ? (
                    <div className="mt-1 space-y-1">
                      {workingAtLocs.map((loc) => (
                        <div
                          key={loc.locationId}
                          className="text-[10px] p-1 rounded bg-white border border-blue-100 text-blue-800 font-medium truncate"
                          title={`${loc.locationName}: ${formatTimeStr(loc.workingHours[key].start)} - ${formatTimeStr(loc.workingHours[key].end)}`}
                        >
                          <div className="font-bold truncate">{loc.locationName.split(" ")[0]}</div>
                          <div className="text-[9px] text-slate-500">
                            {formatTimeStr(loc.workingHours[key].start)}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <span className="text-[10px] text-slate-400 italic block mt-2">Off</span>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Location Selector Tabs */}
      <div>
        <label
          className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2"
          style={{ fontFamily: "DM Sans, sans-serif" }}
        >
          Select Location to Configure Schedule:
        </label>
        <div className="flex flex-wrap gap-2">
          {orgLocations.map((loc) => {
            const isSelected = activeLocId === loc.id;
            const sched = schedules[loc.id];
            const isActive = sched?.isAvailableAtLocation;
            const openDays = sched ? Object.values(sched.workingHours).filter((d) => d.enabled).length : 0;

            return (
              <button
                key={loc.id}
                type="button"
                onClick={() => setActiveLocId(loc.id)}
                className={`flex items-center gap-2.5 px-4 py-2.5 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
                  isSelected
                    ? "bg-primary text-white border-primary shadow-xs"
                    : "bg-white border-slate-200 text-slate-700 hover:border-slate-300 hover:bg-slate-50"
                }`}
                style={{ fontFamily: "DM Sans, sans-serif" }}
              >
                <MapPin className={`w-3.5 h-3.5 ${isSelected ? "text-white" : "text-blue-600"}`} />
                <span>{loc.name}</span>
                <span
                  className={`px-1.5 py-0.2 rounded text-[10px] font-bold uppercase tracking-wider ${
                    isSelected
                      ? "bg-white/20 text-white"
                      : isActive
                      ? "bg-emerald-100 text-emerald-800"
                      : "bg-slate-100 text-slate-500"
                  }`}
                >
                  {isActive ? `${openDays}d Open` : "Inactive"}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Schedule Container for Selected Location */}
      <div className="border border-slate-200/80 rounded-2xl bg-white shadow-xs overflow-hidden">
        {/* Location Header Bar */}
        <div className="p-4 sm:p-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center font-bold shrink-0">
              <MapPin className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h4 className="text-base font-bold text-slate-900 font-display">
                  {currentSchedule.locationName}
                </h4>
                {currentSchedule.isAvailableAtLocation ? (
                  <span className="px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
                    Active at this location
                  </span>
                ) : (
                  <span className="px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded-full bg-slate-100 text-slate-500 border border-slate-200">
                    Inactive
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 mt-0.5" style={TEXT_STYLES.subtext}>
                Set specific working hours and days off when {memberName} is practicing at this facility.
              </p>
            </div>
          </div>

          {/* Active at Location Toggle */}
          <div className="flex items-center gap-2.5 self-start sm:self-auto bg-white px-3.5 py-1.5 rounded-xl border border-slate-200">
            <span className="text-xs font-semibold text-slate-800" style={{ fontFamily: "DM Sans, sans-serif" }}>
              Available Here
            </span>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                className="sr-only peer"
                checked={currentSchedule.isAvailableAtLocation}
                onChange={(e) => handleToggleLocationActive(e.target.checked)}
              />
              <div className="w-10 h-5 bg-slate-200 peer-focus:ring-2 peer-focus:ring-primary/20 rounded-full peer peer-checked:after:translate-x-5 peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600"></div>
            </label>
          </div>
        </div>

        {/* If Inactive at Location Notice */}
        {!currentSchedule.isAvailableAtLocation ? (
          <div className="p-10 text-center space-y-3">
            <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mx-auto text-slate-400">
              <Building2 className="w-6 h-6" />
            </div>
            <h5 className="text-sm font-semibold text-slate-800">
              {memberName} is not currently practicing at {currentSchedule.locationName}
            </h5>
            <p className="text-xs text-slate-500 max-w-md mx-auto">
              Toggle the switch above to "Available Here" to configure weekly working hours and location-specific days off.
            </p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleToggleLocationActive(true)}
              className="text-xs font-semibold text-primary"
            >
              Enable Availability at {currentSchedule.locationName}
            </Button>
          </div>
        ) : (
          <div className="p-5 space-y-5">
            {/* Merged Section Sub-tabs */}
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setActiveSubTab("hours")}
                  className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                    activeSubTab === "hours"
                      ? "bg-primary text-white shadow-xs"
                      : "bg-white border border-slate-200 text-slate-700 hover:bg-slate-50"
                  }`}
                  style={{ fontFamily: "DM Sans, sans-serif" }}
                >
                  <Clock className="w-3.5 h-3.5" />
                  Working Hours ({Object.values(currentSchedule.workingHours).filter((d) => d.enabled).length}/7)
                </button>

                <button
                  type="button"
                  onClick={() => setActiveSubTab("days-off")}
                  className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                    activeSubTab === "days-off"
                      ? "bg-primary text-white shadow-xs"
                      : "bg-white border border-slate-200 text-slate-700 hover:bg-slate-50"
                  }`}
                  style={{ fontFamily: "DM Sans, sans-serif" }}
                >
                  <CalendarOff className="w-3.5 h-3.5" />
                  Days Off & Absences ({currentSchedule.daysOff.length})
                </button>
              </div>

              {activeSubTab === "hours" && (
                <div className="hidden sm:flex items-center gap-2 text-xs">
                  <button
                    type="button"
                    onClick={handleApplyWeekdayHours}
                    className="text-primary hover:underline font-medium cursor-pointer"
                  >
                    Apply 9 AM – 5 PM (Mon–Fri)
                  </button>
                  <span className="text-slate-300">|</span>
                  <button
                    type="button"
                    onClick={handleClearHours}
                    className="text-slate-500 hover:text-slate-800 font-medium cursor-pointer"
                  >
                    Clear Hours
                  </button>
                </div>
              )}
            </div>

            {/* SUB-TAB 1: WORKING HOURS */}
            {activeSubTab === "hours" && (
              <div className="space-y-2.5">
                <div className="grid grid-cols-1 gap-2">
                  {WEEKDAYS.map(({ key, label }) => {
                    const sched = currentSchedule.workingHours[key];
                    return (
                      <div
                        key={key}
                        className={`p-3 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-all ${
                          sched.enabled
                            ? "bg-white border-slate-200 shadow-xs"
                            : "bg-slate-50/60 border-slate-200/60 opacity-75"
                        }`}
                      >
                        <label className="flex items-center gap-3 min-w-[130px] cursor-pointer">
                          <input
                            type="checkbox"
                            checked={sched.enabled}
                            onChange={(e) => handleToggleDay(key, e.target.checked)}
                            className="w-4 h-4 text-primary rounded border-slate-300 focus:ring-primary/20 cursor-pointer"
                          />
                          <span
                            className={`text-sm font-semibold ${
                              sched.enabled ? "text-slate-900" : "text-slate-500"
                            }`}
                            style={{ fontFamily: "DM Sans, sans-serif" }}
                          >
                            {label}
                          </span>
                        </label>

                        {sched.enabled ? (
                          <div className="flex items-center gap-2.5 flex-1 sm:justify-end">
                            <div className="flex items-center gap-1.5">
                              <Clock className="w-3.5 h-3.5 text-slate-400" />
                              <input
                                type="time"
                                value={sched.start}
                                onChange={(e) => handleTimeChange(key, "start", e.target.value)}
                                className="px-2.5 py-1 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary font-medium text-slate-900"
                                style={{ fontFamily: "Outfit, sans-serif" }}
                              />
                            </div>
                            <span className="text-xs text-slate-400">to</span>
                            <input
                              type="time"
                              value={sched.end}
                              onChange={(e) => handleTimeChange(key, "end", e.target.value)}
                              className="px-2.5 py-1 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary font-medium text-slate-900"
                              style={{ fontFamily: "Outfit, sans-serif" }}
                            />
                            <span
                              className="text-[11px] text-slate-500 font-medium hidden md:inline-block ml-2 w-32 text-right"
                              style={{ fontFamily: "Outfit, sans-serif" }}
                            >
                              ({formatTimeStr(sched.start)} – {formatTimeStr(sched.end)})
                            </span>
                          </div>
                        ) : (
                          <span
                            className="text-xs font-medium text-slate-400 italic px-2 py-0.5 rounded bg-slate-100 w-fit"
                            style={{ fontFamily: "Outfit, sans-serif" }}
                          >
                            Unavailable / Off
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>

                <div className="p-3 rounded-xl bg-blue-50/50 border border-blue-100 flex items-start gap-2.5 text-xs text-blue-700 mt-2">
                  <Info className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>
                    When patients or clients book appointments for <strong>{currentSchedule.locationName}</strong>, only these working hours will be presented for {memberName}.
                  </span>
                </div>
              </div>
            )}

            {/* SUB-TAB 2: DAYS OFF & ABSENCES */}
            {activeSubTab === "days-off" && (
              <div className="space-y-4">
                {/* Add Day Off Form */}
                <div className="p-4 rounded-xl border border-slate-200 bg-white space-y-3">
                  <label
                    className="block text-xs font-semibold text-slate-700"
                    style={{ fontFamily: "DM Sans, sans-serif" }}
                  >
                    Schedule Day Off / Absence for {memberName} at {currentSchedule.locationName}
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <span className="text-[11px] text-slate-500 block mb-1">Date *</span>
                      <input
                        type="date"
                        value={draftDate}
                        onChange={(e) => setDraftDate(e.target.value)}
                        min={new Date().toISOString().split("T")[0]}
                        className="w-full px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary text-slate-900"
                      />
                    </div>
                    <div>
                      <span className="text-[11px] text-slate-500 block mb-1">Duration</span>
                      <select
                        value={draftDuration}
                        onChange={(e) => setDraftDuration(e.target.value)}
                        className="w-full px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary text-slate-900"
                      >
                        <option value="All Day">All Day</option>
                        <option value="Morning (Until 1 PM)">Morning Only (Until 1 PM)</option>
                        <option value="Afternoon (After 1 PM)">Afternoon Only (After 1 PM)</option>
                      </select>
                    </div>
                    <div>
                      <span className="text-[11px] text-slate-500 block mb-1">Reason (Optional)</span>
                      <input
                        type="text"
                        placeholder="e.g. Surgery at NY, Holiday"
                        value={draftReason}
                        onChange={(e) => setDraftReason(e.target.value)}
                        className="w-full px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary text-slate-900"
                        style={{ fontFamily: "Outfit, sans-serif" }}
                      />
                    </div>
                  </div>

                  <div className="flex justify-end">
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={handleAddDayOff}
                      className="flex items-center gap-1.5 font-semibold text-xs"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      Add Location Day Off
                    </Button>
                  </div>
                </div>

                {/* Days Off List */}
                {currentSchedule.daysOff.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {currentSchedule.daysOff.map((item) => {
                      const dateObj = new Date(item.date + "T00:00:00");
                      const formatted = !isNaN(dateObj.getTime())
                        ? dateObj.toLocaleDateString("en-US", {
                            weekday: "short",
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                          })
                        : item.date;

                      return (
                        <div
                          key={item.id}
                          className="flex items-center justify-between p-3 rounded-xl border border-slate-200 bg-white shadow-2xs text-xs"
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div className="w-8 h-8 rounded-lg bg-rose-50 border border-rose-100 text-rose-600 flex items-center justify-center shrink-0">
                              <CalendarOff className="w-4 h-4" />
                            </div>
                            <div className="min-w-0">
                              <div
                                className="font-bold text-slate-900 truncate"
                                style={{ fontFamily: "Outfit, sans-serif" }}
                              >
                                {formatted}
                              </div>
                              <div className="flex items-center gap-1.5 text-[11px] text-slate-500 mt-0.5">
                                <span className="font-medium text-slate-600">{item.duration}</span>
                                {item.reason && (
                                  <>
                                    <span>•</span>
                                    <span className="truncate">{item.reason}</span>
                                  </>
                                )}
                              </div>
                            </div>
                          </div>

                          <button
                            type="button"
                            onClick={() => handleRemoveDayOff(item.id)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer shrink-0 ml-2"
                            title="Remove day off"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-center py-8 border-2 border-dashed border-slate-200 rounded-2xl bg-white/50">
                    <CalendarOff className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                    <p className="text-xs text-slate-600 font-medium">No days off recorded for {currentSchedule.locationName}</p>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      Days off added here will only block availability for this specific location.
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
