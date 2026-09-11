import React, { useState, useEffect, useMemo } from "react";
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
  Save,
  AlertCircle,
} from "lucide-react";
import { Button } from "../ui/Button";
import { toast } from "sonner";
import { useOrganization } from "../../context/OrganizationContext";
import { getStoredTeamMembers } from "../../../lib/teamStore";
import ClockTimePicker from "../ui/ClockTimePicker";
import SlotDurationPicker from "../ui/SlotDurationPicker";

export interface DayTimeSlot {
  start: string;
  end: string;
  durationMinutes: number;
}

export interface DayAvailability {
  enabled: boolean;
  slots: DayTimeSlot[];
}

export type WeeklySlots = Record<string, DayAvailability>;

export interface MemberLocationDayOff {
  id: string | number;
  date: string;
  duration: "All Day" | "Morning (Until 1 PM)" | "Afternoon (After 1 PM)" | string;
  reason?: string;
}

export interface MemberLocationSchedule {
  locationId: string;
  locationName: string;
  isAvailableAtLocation: boolean;
  workingHours: any;
  daysOff: MemberLocationDayOff[];
}

const WEEKDAYS = [
  { key: "monday", label: "Monday", short: "Mon" },
  { key: "tuesday", label: "Tuesday", short: "Tue" },
  { key: "wednesday", label: "Wednesday", short: "Wed" },
  { key: "thursday", label: "Thursday", short: "Thu" },
  { key: "friday", label: "Friday", short: "Fri" },
  { key: "saturday", label: "Saturday", short: "Sat" },
  { key: "sunday", label: "Sunday", short: "Sun" },
];

const TIME_OPTIONS: string[] = [];
for (let h = 6; h <= 22; h++) {
  const hh = String(h).padStart(2, "0");
  TIME_OPTIONS.push(`${hh}:00`);
  TIME_OPTIONS.push(`${hh}:30`);
}

const DURATION_OPTIONS = [
  { value: 15, label: "15m" },
  { value: 30, label: "30m" },
  { value: 45, label: "45m" },
  { value: 60, label: "60m" },
];

function createDefaultWeekSlots(): WeeklySlots {
  return {
    monday: { enabled: true, slots: [{ start: "09:00", end: "17:00", durationMinutes: 30 }] },
    tuesday: { enabled: true, slots: [{ start: "09:00", end: "17:00", durationMinutes: 30 }] },
    wednesday: { enabled: true, slots: [{ start: "09:00", end: "17:00", durationMinutes: 30 }] },
    thursday: { enabled: true, slots: [{ start: "09:00", end: "17:00", durationMinutes: 30 }] },
    friday: { enabled: true, slots: [{ start: "09:00", end: "17:00", durationMinutes: 30 }] },
    saturday: { enabled: false, slots: [] },
    sunday: { enabled: false, slots: [] },
  };
}

function formatDateText(dStr: string): string {
  if (!dStr) return "";
  const parts = dStr.split("-").map(Number);
  if (parts.length === 3) {
    const [yr, mo, dy] = parts;
    const dateObj = new Date(yr, mo - 1, dy);
    return dateObj.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  }
  return dStr;
}

export interface MemberLocationScheduleTabProps {
  memberId?: string | number;
  memberName?: string;
  canBookAppointments?: boolean;
  onSave?: (schedules: Record<string, MemberLocationSchedule>) => void;
}

export default function MemberLocationScheduleTab({
  memberId = "default",
  memberName = "Team Member",
  canBookAppointments,
  onSave,
}: MemberLocationScheduleTabProps) {
  const { activeOrganization } = useOrganization();

  // Resolve numeric or canonical user ID to stay 100% in sync with Appointments > TeamAvailabilityTab
  const resolvedUserId = useMemo(() => {
    if (!memberId || memberId === "default") return 1;
    if (typeof memberId === "number") return memberId;
    if (!isNaN(Number(memberId))) return Number(memberId);
    try {
      const all = getStoredTeamMembers();
      const match = all.find(
        (m) => m.email.toLowerCase() === String(memberId).toLowerCase()
      );
      if (match) return match.id;
    } catch {}
    return memberId;
  }, [memberId]);

  // Check appointment booking eligibility
  const isEligibleForBooking = useMemo(() => {
    if (canBookAppointments !== undefined) return canBookAppointments;
    try {
      const all = getStoredTeamMembers();
      const match = all.find(
        (m) =>
          String(m.id) === String(resolvedUserId) ||
          m.email.toLowerCase() === String(memberId).toLowerCase()
      );
      if (match) return match.canBookAppointments === true;
    } catch {}
    return true;
  }, [canBookAppointments, resolvedUserId, memberId]);

  // 1. Organization Locations
  const [locations, setLocations] = useState<Array<{ id: string; name: string }>>(() => {
    try {
      const saved = localStorage.getItem(`mantra_org_locations_${activeOrganization.id}`);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed.map((l: any) => ({ id: l.id, name: l.name }));
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
  });

  const [selectedLocationId, setSelectedLocationId] = useState<string>(
    () => locations[0]?.id || "loc-1"
  );
  const selectedLocation =
    locations.find((l) => l.id === selectedLocationId) || locations[0];

  // Sub-tabs: Manage Slots vs Days Off
  const [activeSubTab, setActiveSubTab] = useState<"slots" | "days-off">("slots");

  // Location Active Availability Map: { [locId]: boolean }
  const locActiveKey = `mantra_user_loc_active_map_${resolvedUserId}_${activeOrganization.id}`;
  const [locationActiveMap, setLocationActiveMap] = useState<Record<string, boolean>>(() => {
    try {
      const saved = localStorage.getItem(locActiveKey);
      if (saved) return JSON.parse(saved);
    } catch {}
    // By default, available at the first location
    const init: Record<string, boolean> = {};
    locations.forEach((loc, idx) => {
      init[loc.id] = idx === 0;
    });
    return init;
  });

  const isAvailableAtLocation = locationActiveMap[selectedLocationId] ?? true;

  const handleToggleLocationActive = (active: boolean) => {
    setLocationActiveMap((prev) => {
      const updated = { ...prev, [selectedLocationId]: active };
      try {
        localStorage.setItem(locActiveKey, JSON.stringify(updated));
      } catch {}
      return updated;
    });
    toast.success(
      active
        ? `${memberName} is now available at ${selectedLocation?.name}`
        : `${memberName} set to unavailable at ${selectedLocation?.name}`
    );
  };

  // 2. Weekly Availability Slots for [User + Location]
  const slotsKey = `mantra_user_loc_slots_${resolvedUserId}_${selectedLocationId}_${activeOrganization.id}`;
  const [weekSlots, setWeekSlots] = useState<WeeklySlots>(() => {
    try {
      const saved = localStorage.getItem(slotsKey);
      if (saved) return JSON.parse(saved);
    } catch {}
    return createDefaultWeekSlots();
  });

  // Reload slots when user or location changes
  useEffect(() => {
    try {
      const saved = localStorage.getItem(
        `mantra_user_loc_slots_${resolvedUserId}_${selectedLocationId}_${activeOrganization.id}`
      );
      if (saved) {
        setWeekSlots(JSON.parse(saved));
        return;
      }
    } catch {}
    setWeekSlots(createDefaultWeekSlots());
  }, [resolvedUserId, selectedLocationId, activeOrganization.id]);

  // 3. Days Off for selected User
  const daysOffKey = `mantra_member_common_days_off_${resolvedUserId}_${activeOrganization.id}`;
  const [daysOff, setDaysOff] = useState<MemberLocationDayOff[]>(() => {
    try {
      const saved = localStorage.getItem(daysOffKey);
      if (saved) return JSON.parse(saved);
    } catch {}
    return [];
  });

  useEffect(() => {
    try {
      const saved = localStorage.getItem(daysOffKey);
      if (saved) {
        setDaysOff(JSON.parse(saved));
        return;
      }
    } catch {}
    setDaysOff([]);
  }, [resolvedUserId, activeOrganization.id, daysOffKey]);

  // Day Off Inline Form states
  const [showAddDayOffInline, setShowAddDayOffInline] = useState(false);
  const [draftStartDate, setDraftStartDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [draftEndDate, setDraftEndDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [draftDuration, setDraftDuration] = useState<"All Day" | "Morning (Until 1 PM)" | "Afternoon (After 1 PM)">("All Day");
  const [draftReason, setDraftReason] = useState("");

  const resetDayOffDraft = () => {
    const today = new Date().toISOString().split("T")[0];
    setDraftStartDate(today);
    setDraftEndDate(today);
    setDraftDuration("All Day");
    setDraftReason("");
  };

  // Toggle day enabled/disabled
  const handleToggleDayEnabled = (dayKey: string, enabled: boolean) => {
    setWeekSlots((prev) => {
      const day = prev[dayKey] || { enabled: false, slots: [] };
      if (!enabled) {
        return {
          ...prev,
          [dayKey]: {
            ...day,
            enabled: false,
          },
        };
      }
      return {
        ...prev,
        [dayKey]: {
          enabled: true,
          slots: day.slots.length > 0 ? day.slots : [{ start: "09:00", end: "17:00", durationMinutes: 30 }],
        },
      };
    });
  };

  // Add slot for a specific day
  const handleAddSlot = (dayKey: string) => {
    setWeekSlots((prev) => {
      const day = prev[dayKey] || { enabled: false, slots: [] };
      const newSlot: DayTimeSlot = { start: "09:00", end: "17:00", durationMinutes: 30 };
      return {
        ...prev,
        [dayKey]: {
          enabled: true,
          slots: [...day.slots, newSlot],
        },
      };
    });
  };

  // Remove slot
  const handleRemoveSlot = (dayKey: string, slotIdx: number) => {
    setWeekSlots((prev) => {
      const day = prev[dayKey];
      if (!day) return prev;
      const updatedSlots = [...day.slots];
      updatedSlots.splice(slotIdx, 1);
      return {
        ...prev,
        [dayKey]: {
          enabled: updatedSlots.length > 0,
          slots: updatedSlots,
        },
      };
    });
  };

  // Update slot field
  const handleUpdateSlot = (
    dayKey: string,
    slotIdx: number,
    field: keyof DayTimeSlot,
    value: any
  ) => {
    setWeekSlots((prev) => {
      const day = prev[dayKey];
      if (!day) return prev;
      const updatedSlots = [...day.slots];
      updatedSlots[slotIdx] = {
        ...updatedSlots[slotIdx],
        [field]: value,
      };
      return {
        ...prev,
        [dayKey]: {
          ...day,
          slots: updatedSlots,
        },
      };
    });
  };

  // Save Slots
  const handleSaveSlots = () => {
    try {
      localStorage.setItem(slotsKey, JSON.stringify(weekSlots));

      // Also keep legacy member location schedule sync
      const legacyKey = `mantra_member_loc_schedules_${resolvedUserId}_${activeOrganization.id}`;
      let legacyMap: Record<string, any> = {};
      try {
        const existing = localStorage.getItem(legacyKey);
        if (existing) legacyMap = JSON.parse(existing);
      } catch {}

      const convertedWorkingHours: any = {};
      WEEKDAYS.forEach(({ key }) => {
        const d = weekSlots[key];
        const s = d?.slots?.[0];
        convertedWorkingHours[key] = {
          enabled: d?.enabled && d.slots.length > 0,
          start: s?.start || "09:00",
          end: s?.end || "17:00",
        };
      });

      legacyMap[selectedLocationId] = {
        locationId: selectedLocationId,
        locationName: selectedLocation.name,
        isAvailableAtLocation,
        workingHours: convertedWorkingHours,
        daysOff,
      };
      localStorage.setItem(legacyKey, JSON.stringify(legacyMap));

      if (onSave) {
        onSave(legacyMap);
      }

      toast.success(`Availability slots saved for ${selectedLocation?.name}`);
    } catch (e) {
      console.error(e);
      toast.error("Failed to save availability");
    }
  };

  // Add Day Off
  const handleSaveDayOff = () => {
    if (!draftStartDate) {
      toast.error("Please select a date");
      return;
    }
    const dateLabel =
      draftStartDate === draftEndDate
        ? draftStartDate
        : `${draftStartDate} to ${draftEndDate}`;

    if (daysOff.some((d) => d.date === dateLabel)) {
      toast.error("This date or range is already marked as a day off");
      return;
    }

    const newDay: MemberLocationDayOff = {
      id: `do-${Date.now()}`,
      date: dateLabel,
      duration: draftDuration,
      reason: draftReason.trim() || undefined,
    };

    const updated = [...daysOff, newDay].sort((a, b) =>
      String(a.date).localeCompare(String(b.date))
    );
    setDaysOff(updated);
    try {
      localStorage.setItem(daysOffKey, JSON.stringify(updated));
    } catch {}

    resetDayOffDraft();
    setShowAddDayOffInline(false);
    toast.success(`Day off added for ${memberName}`);
  };

  // Remove Day Off
  const handleRemoveDayOff = (id: string | number) => {
    const updated = daysOff.filter((d) => d.id !== id);
    setDaysOff(updated);
    try {
      localStorage.setItem(daysOffKey, JSON.stringify(updated));
    } catch {}
    toast.success("Day off removed");
  };

  // If team member is not eligible for appointments
  if (!isEligibleForBooking) {
    return (
      <div className="p-8 text-center bg-slate-50 border border-slate-200/80 rounded-2xl space-y-3">
        <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mx-auto text-slate-400">
          <CalendarOff className="w-6 h-6" />
        </div>
        <h4
          className="text-sm font-bold text-slate-800"
          style={{ fontFamily: "DM Sans, sans-serif" }}
        >
          Appointment Booking Not Enabled
        </h4>
        <p
          className="text-xs text-slate-500 max-w-md mx-auto"
          style={{ fontFamily: "Outfit, sans-serif" }}
        >
          {memberName} is not marked as eligible for appointment booking. Enable appointment booking in their profile settings to configure working hours and days off.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Location Selector Bar */}
      <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/80 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h4
            className="text-sm font-bold text-slate-900"
            style={{ fontFamily: "DM Sans, sans-serif" }}
          >
            Location Availability
          </h4>
          <p
            className="text-xs text-slate-400 mt-0.5"
            style={{ fontFamily: "Outfit, sans-serif" }}
          >
            Select location to set {memberName}&apos;s schedule and availability
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          {/* Location Dropdown */}
          <div className="relative">
            <select
              value={selectedLocationId}
              onChange={(e) => setSelectedLocationId(e.target.value)}
              className="w-full sm:w-auto min-w-[200px] appearance-none pl-9 pr-9 py-2 text-xs font-semibold bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary text-slate-800 cursor-pointer shadow-2xs"
              style={{ fontFamily: "Outfit, sans-serif" }}
            >
              {locations.map((loc) => (
                <option key={loc.id} value={loc.id}>
                  {loc.name}
                </option>
              ))}
            </select>
            <Building2 className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>

          {/* Available at this location toggle */}
          <div className="flex items-center gap-2.5 bg-slate-50 px-3.5 py-1.5 rounded-xl border border-slate-200 self-start sm:self-auto">
            <span
              className="text-xs font-semibold text-slate-700 whitespace-nowrap"
              style={{ fontFamily: "DM Sans, sans-serif" }}
            >
              Available Here
            </span>
            <label className="relative inline-flex items-center cursor-pointer shrink-0">
              <input
                type="checkbox"
                className="sr-only peer"
                checked={isAvailableAtLocation}
                onChange={(e) => handleToggleLocationActive(e.target.checked)}
              />
              <div className="w-10 h-5 bg-slate-200 peer-focus:ring-2 peer-focus:ring-primary/20 rounded-full peer peer-checked:after:translate-x-5 peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600"></div>
            </label>
          </div>
        </div>
      </div>

      {/* If Inactive at Location */}
      {!isAvailableAtLocation ? (
        <div className="p-8 text-center bg-slate-50/70 border border-slate-200/80 rounded-2xl space-y-3">
          <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mx-auto text-slate-400">
            <Building2 className="w-6 h-6" />
          </div>
          <h5
            className="text-sm font-semibold text-slate-800"
            style={{ fontFamily: "DM Sans, sans-serif" }}
          >
            {memberName} is not available at {selectedLocation.name}
          </h5>
          <p
            className="text-xs text-slate-500 max-w-md mx-auto"
            style={{ fontFamily: "Outfit, sans-serif" }}
          >
            Toggle the &quot;Available Here&quot; switch above to configure time slots and availability for this facility.
          </p>
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleToggleLocationActive(true)}
            className="text-xs font-semibold text-primary cursor-pointer"
          >
            Enable Availability at {selectedLocation.name}
          </Button>
        </div>
      ) : (
        /* If Available at Location: Slots & Days Off */
        <div className="space-y-4">
          {/* Sub-tabs: Manage Slots | Days Off */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setActiveSubTab("slots")}
              className={`px-4 py-1.5 text-xs font-semibold rounded-full transition-all cursor-pointer ${
                activeSubTab === "slots"
                  ? "bg-[#1A73E8] text-white shadow-xs"
                  : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
              }`}
              style={{ fontFamily: "DM Sans, sans-serif" }}
            >
              Manage Slots
            </button>

            <button
              type="button"
              onClick={() => setActiveSubTab("days-off")}
              className={`px-4 py-1.5 text-xs font-semibold rounded-full transition-all cursor-pointer ${
                activeSubTab === "days-off"
                  ? "bg-[#1A73E8] text-white shadow-xs"
                  : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
              }`}
              style={{ fontFamily: "DM Sans, sans-serif" }}
            >
              Days Off ({daysOff.length})
            </button>
          </div>

          {/* SUB-TAB 1: MANAGE SLOTS */}
          {activeSubTab === "slots" && (
            <div className="space-y-4">
              {/* 7-Day Availability List (Days View) */}
              <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs divide-y divide-slate-100 overflow-hidden">
                {WEEKDAYS.map(({ key, label }) => {
                  const day = weekSlots[key] || { enabled: false, slots: [] };
                  const hasSlots = day.enabled && day.slots.length > 0;

                  return (
                    <div
                      key={key}
                      className={`flex flex-col md:flex-row md:items-start p-4 sm:p-4.5 gap-4 transition-colors ${
                        hasSlots ? "bg-white hover:bg-slate-50/40" : "bg-slate-50/30 hover:bg-slate-50/60"
                      }`}
                    >
                      {/* Left Column: Day info & Checkbox (NO slot count badge) */}
                      <div className="w-36 shrink-0 flex items-center gap-2.5">
                        <input
                          type="checkbox"
                          id={`drawer-toggle-${key}`}
                          checked={hasSlots}
                          onChange={(e) => handleToggleDayEnabled(key, e.target.checked)}
                          className="w-4 h-4 rounded border-slate-300 text-primary focus:ring-primary/20 cursor-pointer"
                        />
                        <label
                          htmlFor={`drawer-toggle-${key}`}
                          className="text-sm font-bold text-slate-800 cursor-pointer select-none"
                          style={{ fontFamily: "DM Sans, sans-serif" }}
                        >
                          {label}
                        </label>
                      </div>

                      {/* Middle Column: In front of the day, show slots */}
                      <div className="flex-1 min-w-0">
                        {!hasSlots ? (
                          <span className="text-xs font-medium text-slate-400 italic">
                            Unavailable
                          </span>
                        ) : (
                          <div className="space-y-2">
                            {day.slots.map((slot, slotIdx) => (
                              <div
                                key={slotIdx}
                                className="flex items-center gap-2 flex-wrap sm:flex-nowrap"
                              >
                                {/* Start Time Clock Picker */}
                                <ClockTimePicker
                                  value={slot.start}
                                  onChange={(newTime) =>
                                    handleUpdateSlot(key, slotIdx, "start", newTime)
                                  }
                                />

                                <span className="text-xs text-slate-400 font-medium">–</span>

                                {/* End Time Clock Picker */}
                                <ClockTimePicker
                                  value={slot.end}
                                  onChange={(newTime) =>
                                    handleUpdateSlot(key, slotIdx, "end", newTime)
                                  }
                                />

                                {/* Duration with Custom Option */}
                                <SlotDurationPicker
                                  value={slot.durationMinutes}
                                  onChange={(newDuration) =>
                                    handleUpdateSlot(
                                      key,
                                      slotIdx,
                                      "durationMinutes",
                                      newDuration
                                    )
                                  }
                                />

                                {/* Delete Slot */}
                                <button
                                  type="button"
                                  onClick={() => handleRemoveSlot(key, slotIdx)}
                                  className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                                  title="Delete Slot"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Right Corner: Add Slot Button */}
                      <div className="shrink-0 flex items-center justify-end">
                        <button
                          type="button"
                          onClick={() => handleAddSlot(key)}
                          className="p-1.5 rounded-lg text-blue-600 hover:bg-blue-50 transition-colors cursor-pointer"
                          title={`Add slot for ${label}`}
                        >
                          <Plus className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Save Slots Action */}
              <div className="flex justify-end pt-2">
                <Button
                  variant="primary"
                  size="sm"
                  onClick={handleSaveSlots}
                  className="gap-1.5 text-xs font-semibold px-4 cursor-pointer"
                >
                  <Save className="w-3.5 h-3.5" />
                  Save Availability
                </Button>
              </div>
            </div>
          )}

          {/* SUB-TAB 2: DAYS OFF */}
          {activeSubTab === "days-off" && (
            <div className="space-y-4">
              {/* Header + Add Day Off Button */}
              <div className="flex items-center justify-between">
                <div>
                  <h4
                    className="text-xs font-bold text-slate-800"
                    style={{ fontFamily: "DM Sans, sans-serif" }}
                  >
                    Scheduled Days Off
                  </h4>
                  <p
                    className="text-[11px] text-slate-400 mt-0.5"
                    style={{ fontFamily: "Outfit, sans-serif" }}
                  >
                    Days when {memberName} will not be available for appointments
                  </p>
                </div>

                {!showAddDayOffInline && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowAddDayOffInline(true)}
                    className="gap-1.5 text-xs font-semibold cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5 text-primary" />
                    Add Day Off
                  </Button>
                )}
              </div>

              {/* Inline Add Day Off Form */}
              {showAddDayOffInline && (
                <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs space-y-3">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                    <span
                      className="text-xs font-bold text-slate-800"
                      style={{ fontFamily: "DM Sans, sans-serif" }}
                    >
                      New Day Off
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        resetDayOffDraft();
                        setShowAddDayOffInline(false);
                      }}
                      className="text-slate-400 hover:text-slate-600 cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <span className="text-[11px] text-slate-500 block mb-1">Start Date *</span>
                      <input
                        type="date"
                        value={draftStartDate}
                        onChange={(e) => setDraftStartDate(e.target.value)}
                        className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary text-slate-900"
                      />
                    </div>

                    <div>
                      <span className="text-[11px] text-slate-500 block mb-1">End Date (Optional)</span>
                      <input
                        type="date"
                        value={draftEndDate}
                        min={draftStartDate || undefined}
                        onChange={(e) => setDraftEndDate(e.target.value)}
                        className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary text-slate-900"
                      />
                    </div>

                    <div>
                      <span className="text-[11px] text-slate-500 block mb-1">Duration</span>
                      <select
                        value={draftDuration}
                        onChange={(e) => setDraftDuration(e.target.value as any)}
                        className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary text-slate-900 cursor-pointer"
                      >
                        <option value="All Day">All Day</option>
                        <option value="Morning (Until 1 PM)">Morning (Until 1 PM)</option>
                        <option value="Afternoon (After 1 PM)">Afternoon (After 1 PM)</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <span className="text-[11px] text-slate-500 block mb-1">Reason (Optional)</span>
                    <input
                      type="text"
                      placeholder="e.g., Vacation, Personal leave, Holiday"
                      value={draftReason}
                      onChange={(e) => setDraftReason(e.target.value)}
                      className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary text-slate-900"
                    />
                  </div>

                  <div className="flex justify-end gap-2 pt-1">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        resetDayOffDraft();
                        setShowAddDayOffInline(false);
                      }}
                      className="text-xs"
                    >
                      Cancel
                    </Button>
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={handleSaveDayOff}
                      className="text-xs font-semibold"
                    >
                      Save Day Off
                    </Button>
                  </div>
                </div>
              )}

              {/* Days Off List */}
              {daysOff.length === 0 ? (
                <div className="text-center py-8 border border-dashed border-slate-200 rounded-xl bg-slate-50/50">
                  <CalendarOff className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                  <p
                    className="text-xs font-semibold text-slate-600"
                    style={{ fontFamily: "DM Sans, sans-serif" }}
                  >
                    No days off scheduled
                  </p>
                  <p
                    className="text-[11px] text-slate-400 mt-0.5"
                    style={{ fontFamily: "Outfit, sans-serif" }}
                  >
                    Click &quot;Add Day Off&quot; to add holidays or absences.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {daysOff.map((day) => (
                    <div
                      key={day.id}
                      className="p-3 bg-white border border-slate-200 rounded-xl flex items-center justify-between shadow-2xs"
                    >
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-lg bg-red-50 text-red-600 flex items-center justify-center shrink-0">
                          <Calendar className="w-4 h-4" />
                        </div>
                        <div>
                          <div
                            className="text-xs font-bold text-slate-900"
                            style={{ fontFamily: "DM Sans, sans-serif" }}
                          >
                            {day.date.includes(" to ")
                              ? `${formatDateText(day.date.split(" to ")[0])} – ${formatDateText(day.date.split(" to ")[1])}`
                              : formatDateText(day.date)}
                          </div>
                          <div className="flex items-center gap-1.5 text-[10px] text-slate-500 mt-0.5">
                            <span className="px-1.5 py-0.2 rounded bg-slate-100 font-medium text-slate-600">
                              {day.duration}
                            </span>
                            {day.reason && <span>• {day.reason}</span>}
                          </div>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleRemoveDayOff(day.id)}
                        className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                        title="Remove day off"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
