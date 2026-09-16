import React, { useState, useEffect, useMemo, useRef } from "react";
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
  X,
} from "lucide-react";
import { Button } from "../ui/Button";
import { toast } from "sonner";
import { useOrganization } from "../../context/OrganizationContext";
import { getStoredTeamMembers, saveStoredTeamMembers, TEAM_STORE_EVENT } from "../../../lib/teamStore";
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

function timeToMinutes(t: string): number {
  if (!t) return 0;
  const [h, m] = t.split(":").map(Number);
  return (h || 0) * 60 + (m || 0);
}

function minutesToTime(m: number): string {
  const hh = String(Math.floor(m / 60)).padStart(2, "0");
  const mm = String(m % 60).padStart(2, "0");
  return `${hh}:${mm}`;
}

function getDefaultWeekSlotsForLocation(locWorkingHours?: any): WeeklySlots {
  const result: WeeklySlots = {};
  WEEKDAYS.forEach(({ key }) => {
    const locDay = locWorkingHours?.[key];
    if (locDay && locDay.enabled) {
      result[key] = {
        enabled: true,
        slots: [{
          start: locDay.start || "09:00",
          end: locDay.end || "17:00",
          durationMinutes: 30,
        }],
      };
    } else if (locDay && !locDay.enabled) {
      result[key] = { enabled: false, slots: [] };
    } else {
      const isWeekend = key === "saturday" || key === "sunday";
      result[key] = {
        enabled: !isWeekend,
        slots: isWeekend ? [] : [{ start: "09:00", end: "17:00", durationMinutes: 30 }],
      };
    }
  });
  return result;
}

function sanitizeSlotsWithLocationHours(slots: WeeklySlots, locWorkingHours?: any): WeeklySlots {
  if (!locWorkingHours) return slots;
  const result: WeeklySlots = {};

  WEEKDAYS.forEach(({ key }) => {
    const locDay = locWorkingHours[key];
    const userDay = slots[key];

    // If location is closed on this day, member must be unavailable
    if (locDay && !locDay.enabled) {
      result[key] = { enabled: false, slots: [] };
      return;
    }

    if (!userDay || !userDay.enabled || !userDay.slots || userDay.slots.length === 0) {
      result[key] = { enabled: false, slots: [] };
      return;
    }

    const locStartMin = locDay?.start ? timeToMinutes(locDay.start) : timeToMinutes("00:00");
    const locEndMin = locDay?.end ? timeToMinutes(locDay.end) : timeToMinutes("23:59");

    const clampedSlots: DayTimeSlot[] = [];
    userDay.slots.forEach((s) => {
      let sMin = Math.max(timeToMinutes(s.start), locStartMin);
      let eMin = Math.min(timeToMinutes(s.end), locEndMin);

      if (sMin >= eMin) {
        sMin = locStartMin;
        eMin = locEndMin;
      }

      clampedSlots.push({
        start: minutesToTime(sMin),
        end: minutesToTime(eMin),
        durationMinutes: s.durationMinutes || 30,
      });
    });

    result[key] = {
      enabled: clampedSlots.length > 0,
      slots: clampedSlots,
    };
  });
  return result;
}

function createDefaultWeekSlots(): WeeklySlots {
  return getDefaultWeekSlotsForLocation();
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

  const [locVersion, setLocVersion] = useState(0);
  useEffect(() => {
    const handleUpdate = () => setLocVersion((v) => v + 1);
    window.addEventListener("storage", handleUpdate);
    window.addEventListener("mantra_locations_changed", handleUpdate);
    window.addEventListener(TEAM_STORE_EVENT, handleUpdate);
    return () => {
      window.removeEventListener("storage", handleUpdate);
      window.removeEventListener("mantra_locations_changed", handleUpdate);
      window.removeEventListener(TEAM_STORE_EVENT, handleUpdate);
    };
  }, []);

  // 1. All Organization Locations (Full Clinic Catalog)
  const allOrgLocations = useMemo<Array<{ id: string; name: string; workingHours?: any; daysOff?: any[] }>>(() => {
    const list: Array<{ id: string; name: string; workingHours?: any; daysOff?: any[] }> = [];
    const seen = new Set<string>();

    try {
      const saved = localStorage.getItem(`mantra_org_locations_${activeOrganization.id}`);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          parsed.forEach((l: any) => {
            if (!seen.has(l.name.toLowerCase())) {
              seen.add(l.name.toLowerCase());
              list.push({ id: l.id, name: l.name, workingHours: l.workingHours, daysOff: l.daysOff });
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
      const isOnline = name.toLowerCase() === "online" || name.toLowerCase().includes("virtual");
      const formatted = isOnline
        ? "Online"
        : name.includes("Center") || name.includes("Clinic") || name.includes("Branch")
        ? name
        : `${name} Branch`;
      if (!seen.has(formatted.toLowerCase())) {
        seen.add(formatted.toLowerCase());
        list.push({ id: `loc-${idx + 1}`, name: formatted });
      }
    });

    if (!list.some((l) => l.name.toLowerCase() === "online")) {
      list.push({ id: "loc-online", name: "Online" });
    }

    return list;
  }, [activeOrganization, locVersion]);

  // Location Active Availability Map: { [locId]: boolean }
  const locActiveKey = `mantra_user_loc_active_map_${resolvedUserId}_${activeOrganization.id}`;
  const [locationActiveMap, setLocationActiveMap] = useState<Record<string, boolean>>(() => {
    try {
      const saved = localStorage.getItem(locActiveKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Object.keys(parsed).length > 0) return parsed;
      }
    } catch {}

    // Initialize from member's assigned locations in teamStore if available
    try {
      const allMembers = getStoredTeamMembers();
      const currentMember = allMembers.find(
        (m) => String(m.id) === String(resolvedUserId) || m.email.toLowerCase() === String(memberId).toLowerCase()
      );
      const memberLocsList = currentMember?.locations || (currentMember as any)?.availableLocations;
      if (Array.isArray(memberLocsList) && memberLocsList.length > 0) {
        const init: Record<string, boolean> = {};
        allOrgLocations.forEach((loc) => {
          if (memberLocsList.includes(loc.name) || memberLocsList.includes(loc.id)) {
            init[loc.id] = true;
          }
        });
        if (Object.values(init).some(Boolean)) return init;
      }
    } catch {}

    // Default: available at first location only
    const init: Record<string, boolean> = {};
    allOrgLocations.forEach((loc, idx) => {
      init[loc.id] = idx === 0;
    });
    return init;
  });

  // Locations currently available / assigned to this member ONLY
  const userAvailableLocations = useMemo(() => {
    const list = allOrgLocations.filter(
      (loc) => locationActiveMap[loc.id] === true || locationActiveMap[loc.name] === true
    );
    if (list.length > 0) return list;
    return allOrgLocations.slice(0, 1);
  }, [allOrgLocations, locationActiveMap]);

  // Other Clinic Locations not yet added to this member's schedule
  const unassignedOrgLocations = useMemo(() => {
    const assignedIds = new Set(userAvailableLocations.map((l) => l.id));
    const assignedNames = new Set(userAvailableLocations.map((l) => l.name.toLowerCase()));
    return allOrgLocations.filter(
      (loc) => !assignedIds.has(loc.id) && !assignedNames.has(loc.name.toLowerCase())
    );
  }, [allOrgLocations, userAvailableLocations]);

  const [selectedLocationId, setSelectedLocationId] = useState<string>(
    () => userAvailableLocations[0]?.id || "loc-1"
  );

  // Sync selected location if selection is no longer in active locations
  useEffect(() => {
    if (!userAvailableLocations.some((l) => l.id === selectedLocationId)) {
      if (userAvailableLocations.length > 0) {
        setSelectedLocationId(userAvailableLocations[0].id);
      }
    }
  }, [userAvailableLocations, selectedLocationId]);

  const selectedLocation =
    userAvailableLocations.find((l) => l.id === selectedLocationId) ||
    allOrgLocations.find((l) => l.id === selectedLocationId) ||
    allOrgLocations[0];

  // Sub-tabs: Manage Slots vs Days Off
  const [activeSubTab, setActiveSubTab] = useState<"slots" | "days-off">("slots");

  const [showAddLocationMenu, setShowAddLocationMenu] = useState(false);
  const addLocRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (addLocRef.current && !addLocRef.current.contains(e.target as Node)) {
        setShowAddLocationMenu(false);
      }
    };
    if (showAddLocationMenu) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [showAddLocationMenu]);

  // Add an unassigned clinic location to this member's schedule
  const handleAddLocationToMember = (loc: { id: string; name: string }) => {
    const updatedMap = { ...locationActiveMap, [loc.id]: true, [loc.name]: true };
    setLocationActiveMap(updatedMap);
    try {
      localStorage.setItem(locActiveKey, JSON.stringify(updatedMap));
    } catch {}

    // Update teamStore
    try {
      const all = getStoredTeamMembers();
      const updated = all.map((m) => {
        if (String(m.id) === String(resolvedUserId) || m.email.toLowerCase() === String(memberId).toLowerCase()) {
          const currentLocs = m.locations || (m as any).availableLocations || [];
          if (!currentLocs.includes(loc.name)) {
            return { ...m, locations: [...currentLocs, loc.name] };
          }
        }
        return m;
      });
      saveStoredTeamMembers(updated);
    } catch {}

    setSelectedLocationId(loc.id);
    setShowAddLocationMenu(false);
    toast.success(`Added ${loc.name} to ${memberName}'s schedule`);
  };

  // Remove a location from this member's schedule
  const handleRemoveLocationFromMember = (locId: string) => {
    const locToRemove = allOrgLocations.find((l) => l.id === locId);
    const updatedMap = { ...locationActiveMap, [locId]: false };
    if (locToRemove) {
      updatedMap[locToRemove.name] = false;
    }
    setLocationActiveMap(updatedMap);
    try {
      localStorage.setItem(locActiveKey, JSON.stringify(updatedMap));
    } catch {}

    // Update teamStore
    try {
      const all = getStoredTeamMembers();
      const updated = all.map((m) => {
        if (String(m.id) === String(resolvedUserId) || m.email.toLowerCase() === String(memberId).toLowerCase()) {
          const currentLocs = m.locations || (m as any).availableLocations || [];
          return {
            ...m,
            locations: currentLocs.filter((ln: string) => ln !== locToRemove?.name && ln !== locId),
          };
        }
        return m;
      });
      saveStoredTeamMembers(updated);
    } catch {}

    const remaining = userAvailableLocations.filter((l) => l.id !== locId);
    if (remaining.length > 0) {
      setSelectedLocationId(remaining[0].id);
    }
    toast.success(`Removed ${locToRemove?.name || "location"} from ${memberName}'s schedule`);
  };

  // 2. Weekly Availability Slots for [User + Location]
  const slotsKey = `mantra_user_loc_slots_${resolvedUserId}_${selectedLocationId}_${activeOrganization.id}`;
  const [weekSlots, setWeekSlots] = useState<WeeklySlots>(() => {
    try {
      const saved = localStorage.getItem(slotsKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        return sanitizeSlotsWithLocationHours(parsed, selectedLocation?.workingHours);
      }
    } catch {}
    return getDefaultWeekSlotsForLocation(selectedLocation?.workingHours);
  });

  // Reload slots when user or location changes
  useEffect(() => {
    try {
      const saved = localStorage.getItem(
        `mantra_user_loc_slots_${resolvedUserId}_${selectedLocationId}_${activeOrganization.id}`
      );
      if (saved) {
        const parsed = JSON.parse(saved);
        setWeekSlots(sanitizeSlotsWithLocationHours(parsed, selectedLocation?.workingHours));
        return;
      }
    } catch {}
    setWeekSlots(getDefaultWeekSlotsForLocation(selectedLocation?.workingHours));
  }, [resolvedUserId, selectedLocationId, activeOrganization.id, selectedLocation]);

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
    const locDay = selectedLocation?.workingHours?.[dayKey];
    if (enabled && locDay && !locDay.enabled) {
      toast.error(`${selectedLocation?.name || "Location"} is closed on ${dayKey.charAt(0).toUpperCase() + dayKey.slice(1)}`);
      return;
    }

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
      const locStart = locDay?.start || "09:00";
      const locEnd = locDay?.end || "17:00";
      return {
        ...prev,
        [dayKey]: {
          enabled: true,
          slots: day.slots.length > 0 ? day.slots : [{ start: locStart, end: locEnd, durationMinutes: 30 }],
        },
      };
    });
  };

  // Add slot for a specific day
  const handleAddSlot = (dayKey: string) => {
    const locDay = selectedLocation?.workingHours?.[dayKey];
    if (locDay && !locDay.enabled) {
      toast.error(`${selectedLocation?.name || "Location"} is closed on ${dayKey.charAt(0).toUpperCase() + dayKey.slice(1)}`);
      return;
    }
    const locStart = locDay?.start || "09:00";
    const locEnd = locDay?.end || "17:00";

    setWeekSlots((prev) => {
      const day = prev[dayKey] || { enabled: false, slots: [] };
      const newSlot: DayTimeSlot = { start: locStart, end: locEnd, durationMinutes: 30 };
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
    const locDay = selectedLocation?.workingHours?.[dayKey];
    const locStartMin = locDay?.start ? timeToMinutes(locDay.start) : timeToMinutes("00:00");
    const locEndMin = locDay?.end ? timeToMinutes(locDay.end) : timeToMinutes("23:59");

    let finalVal = value;
    if (field === "start") {
      const valMin = timeToMinutes(value);
      if (valMin < locStartMin) {
        toast.error(`Start time cannot be before location opening time (${locDay.start})`);
        finalVal = locDay.start;
      } else if (valMin >= locEndMin) {
        toast.error(`Start time must be before location closing time (${locDay.end})`);
        return;
      }
    } else if (field === "end") {
      const valMin = timeToMinutes(value);
      if (valMin > locEndMin) {
        toast.error(`End time cannot be after location closing time (${locDay.end})`);
        finalVal = locDay.end;
      } else if (valMin <= locStartMin) {
        toast.error(`End time must be after location opening time (${locDay.start})`);
        return;
      }
    }

    setWeekSlots((prev) => {
      const day = prev[dayKey];
      if (!day) return prev;
      const updatedSlots = [...day.slots];
      updatedSlots[slotIdx] = {
        ...updatedSlots[slotIdx],
        [field]: finalVal,
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
        isAvailableAtLocation: true,
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

        <div className="flex flex-wrap items-center gap-2.5">
          {/* Location Dropdown - ONLY Member's Assigned Locations */}
          <div className="relative">
            <select
              value={selectedLocationId}
              onChange={(e) => setSelectedLocationId(e.target.value)}
              className="w-full sm:w-auto min-w-[200px] appearance-none pl-9 pr-9 py-2 text-xs font-semibold bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary text-slate-800 cursor-pointer shadow-2xs"
              style={{ fontFamily: "Outfit, sans-serif" }}
            >
              {userAvailableLocations.map((loc) => (
                <option key={loc.id} value={loc.id}>
                  {loc.name}
                </option>
              ))}
            </select>
            <Building2 className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>

          {/* + Add Location Dropdown/Button for Other Clinic Locations */}
          {unassignedOrgLocations.length > 0 && (
            <div className="relative" ref={addLocRef}>
              <button
                type="button"
                onClick={() => setShowAddLocationMenu(!showAddLocationMenu)}
                className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold bg-blue-50 text-blue-600 hover:bg-blue-100/80 border border-blue-200 rounded-xl transition-all cursor-pointer shadow-2xs"
                style={{ fontFamily: "Outfit, sans-serif" }}
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Location</span>
                <ChevronDown className={`w-3.5 h-3.5 transition-transform ${showAddLocationMenu ? "rotate-180" : ""}`} />
              </button>

              {showAddLocationMenu && (
                <div className="absolute left-0 sm:right-0 sm:left-auto mt-1.5 w-64 bg-white border border-slate-200 rounded-xl shadow-xl z-50 py-1.5 overflow-hidden animate-in fade-in-50 zoom-in-95 duration-100">
                  <div className="px-3 py-1.5 border-b border-slate-100 bg-slate-50/70">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Other Clinic Locations</p>
                  </div>
                  <div className="max-h-48 overflow-y-auto divide-y divide-slate-50">
                    {unassignedOrgLocations.map((loc) => (
                      <button
                        key={loc.id}
                        type="button"
                        onClick={() => handleAddLocationToMember(loc)}
                        className="w-full flex items-center justify-between px-3 py-2 text-left hover:bg-slate-50 transition-colors cursor-pointer group"
                      >
                        <div className="min-w-0 pr-2">
                          <p className="text-xs font-semibold text-slate-800 group-hover:text-blue-600 truncate">{loc.name}</p>
                          <p className="text-[10px] text-slate-400">Click to add to {memberName}</p>
                        </div>
                        <Plus className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Remove from Schedule button if member has multiple locations */}
          {userAvailableLocations.length > 1 && (
            <button
              type="button"
              onClick={() => handleRemoveLocationFromMember(selectedLocationId)}
              className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl border border-transparent hover:border-rose-200 transition-all cursor-pointer"
              title={`Remove ${selectedLocation.name} from ${memberName}'s schedule`}
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Slots & Days Off */}
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
                  const locDay = selectedLocation?.workingHours?.[key];
                  const isLocClosed = locDay ? !locDay.enabled : false;

                  return (
                    <div
                      key={key}
                      className={`flex flex-col md:flex-row md:items-start p-4 sm:p-4.5 gap-4 transition-colors ${
                        isLocClosed
                          ? "bg-slate-100/50 opacity-75"
                          : hasSlots
                          ? "bg-white hover:bg-slate-50/40"
                          : "bg-slate-50/30 hover:bg-slate-50/60"
                      }`}
                    >
                      {/* Left Column: Day info & Checkbox (NO slot count badge) */}
                      <div className="w-44 shrink-0 flex items-center gap-2.5">
                        <input
                          type="checkbox"
                          id={`drawer-toggle-${key}`}
                          checked={hasSlots && !isLocClosed}
                          disabled={isLocClosed}
                          onChange={(e) => handleToggleDayEnabled(key, e.target.checked)}
                          className={`w-4 h-4 rounded border-slate-300 text-primary focus:ring-primary/20 ${
                            isLocClosed ? "cursor-not-allowed opacity-40" : "cursor-pointer"
                          }`}
                        />
                        <div className="flex flex-col">
                          <label
                            htmlFor={`drawer-toggle-${key}`}
                            className={`text-sm font-bold select-none ${
                              isLocClosed ? "text-slate-400 cursor-not-allowed" : "text-slate-800 cursor-pointer"
                            }`}
                            style={{ fontFamily: "DM Sans, sans-serif" }}
                          >
                            {label}
                          </label>
                          {locDay && (
                            <span className="text-[10px] text-slate-400 font-medium">
                              {locDay.enabled ? `Open ${locDay.start}–${locDay.end}` : "Location Closed"}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Middle Column: In front of the day, show slots */}
                      <div className="flex-1 min-w-0">
                        {isLocClosed ? (
                          <span className="text-xs font-medium text-slate-400 italic">
                            Location Closed on this day
                          </span>
                        ) : !hasSlots ? (
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
                      {!isLocClosed && (
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
                      )}
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
    </div>
  );
}
