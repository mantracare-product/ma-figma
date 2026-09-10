import React, { useState, useEffect, useMemo } from "react";
import {
  Clock,
  Calendar,
  CalendarOff,
  Plus,
  Trash2,
  ChevronDown,
  X,
  Building2,
  User,
} from "lucide-react";
import { Button } from "../ui/Button";
import { toast } from "sonner";
import { useOrganization } from "../../context/OrganizationContext";
import TargetUserDropdown from "./TargetUserDropdown";
import { useTeamMembers } from "../../../lib/teamStore";

export interface DayTimeSlot {
  start: string; // "09:00"
  end: string;   // "17:00"
  durationMinutes: number; // 30
}

export interface DayAvailability {
  enabled: boolean;
  slots: DayTimeSlot[];
}

export type WeeklySlots = Record<string, DayAvailability>;

export interface TeamMemberDayOff {
  id: string | number;
  date: string; // YYYY-MM-DD
  duration: "All Day" | "Morning (Until 1 PM)" | "Afternoon (After 1 PM)";
  reason?: string;
}

export interface TeamMember {
  id: number | string;
  name: string;
  email: string;
  role?: string;
}

const WEEKDAYS = [
  { key: "monday", label: "Monday" },
  { key: "tuesday", label: "Tuesday" },
  { key: "wednesday", label: "Wednesday" },
  { key: "thursday", label: "Thursday" },
  { key: "friday", label: "Friday" },
  { key: "saturday", label: "Saturday" },
  { key: "sunday", label: "Sunday" },
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

function timeToMinutes(t: string): number {
  if (!t) return 0;
  const [h, m] = t.split(":").map(Number);
  return (h || 0) * 60 + (m || 0);
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

function formatDisplayDayOff(dateStr: string): string {
  if (!dateStr) return "";
  if (dateStr.includes(" to ")) {
    const [start, end] = dateStr.split(" to ");
    return `${formatDateText(start)} - ${formatDateText(end)}`;
  }
  const formatted = formatDateText(dateStr);
  return `${formatted} - ${formatted}`;
}

interface TeamAvailabilityTabProps {
  employees?: TeamMember[];
}

export default function TeamAvailabilityTab({ employees: propEmployees }: TeamAvailabilityTabProps) {
  const { activeOrganization } = useOrganization();

  // Subtabs: Manage Slots vs Days Off
  const [activeTab, setActiveTab] = useState<"slots" | "days-off">("slots");

  // Fallback default team members
  const defaultEmployees: TeamMember[] = useMemo(
    () => [
      { id: 1, name: "FARDEEN S KHADRI", email: "fardeen@mantra.care", role: "Team Member" },
      { id: 2, name: "Sarah Johnson", email: "sarah.j@healthcare.com", role: "Specialist" },
      { id: 4, name: "Emily Davis", email: "emily.d@healthcare.com", role: "Nurse Practitioner" },
      { id: 5, name: "Dr. Robert Martinez", email: "robert.m@dentalcare.com", role: "Dental Surgeon" },
      { id: 6, name: "Lisa Anderson", email: "lisa.a@dentalcare.com", role: "Hygienist" },
    ],
    []
  );

  const { bookableMembers } = useTeamMembers();

  const teamList = useMemo(() => {
    if (bookableMembers && bookableMembers.length > 0) {
      return bookableMembers.map((m) => ({
        id: Number(m.id) || m.id,
        name: m.name,
        email: m.email,
        role: m.role || "Team Member",
      }));
    }
    return propEmployees && propEmployees.length > 0 ? propEmployees : defaultEmployees;
  }, [bookableMembers, propEmployees, defaultEmployees]);

  // Selected Target User
  const [selectedUserId, setSelectedUserId] = useState<string | number>(() => teamList[0]?.id || 1);

  useEffect(() => {
    if (teamList.length > 0 && !teamList.some((u) => String(u.id) === String(selectedUserId))) {
      setSelectedUserId(teamList[0].id);
    }
  }, [teamList, selectedUserId]);

  const selectedUser = teamList.find((u) => String(u.id) === String(selectedUserId)) || teamList[0];

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

    const orgLocs = activeOrganization.locations && activeOrganization.locations.length > 0
      ? activeOrganization.locations
      : [activeOrganization.location || "California"];

    return orgLocs.map((name, idx) => ({
      id: `loc-${idx + 1}`,
      name: name.includes("Center") || name.includes("Clinic") || name.includes("Branch") ? name : `${name} Branch`,
    }));
  });

  // Selected Location
  const [selectedLocationId, setSelectedLocationId] = useState<string>(() => locations[0]?.id || "loc-1");
  const selectedLocation = locations.find((l) => l.id === selectedLocationId) || locations[0];

  // 2. Weekly Availability Slots for [User + Location]
  const slotsKey = `mantra_user_loc_slots_${selectedUserId}_${selectedLocationId}_${activeOrganization.id}`;
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
        `mantra_user_loc_slots_${selectedUserId}_${selectedLocationId}_${activeOrganization.id}`
      );
      if (saved) {
        setWeekSlots(JSON.parse(saved));
        return;
      }
    } catch {}
    setWeekSlots(createDefaultWeekSlots());
  }, [selectedUserId, selectedLocationId, activeOrganization.id]);

  // 3. Common Days Off for selected User (Universal across all locations)
  const daysOffKey = `mantra_member_common_days_off_${selectedUserId}_${activeOrganization.id}`;
  const [daysOff, setDaysOff] = useState<TeamMemberDayOff[]>(() => {
    try {
      const saved = localStorage.getItem(daysOffKey);
      if (saved) return JSON.parse(saved);
    } catch {}
    return [];
  });

  // Reload days off when user changes
  useEffect(() => {
    try {
      const saved = localStorage.getItem(
        `mantra_member_common_days_off_${selectedUserId}_${activeOrganization.id}`
      );
      if (saved) {
        setDaysOff(JSON.parse(saved));
        return;
      }
    } catch {}
    setDaysOff([]);
  }, [selectedUserId, activeOrganization.id]);

  // Day Off Inline Form states (replaces popup)
  const [showAddDayOffInline, setShowAddDayOffInline] = useState(false);
  const [draftStartDate, setDraftStartDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [draftStartTime, setDraftStartTime] = useState("00:00");
  const [draftEndDate, setDraftEndDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [draftEndTime, setDraftEndTime] = useState("23:59");
  const [draftReason, setDraftReason] = useState("");
  const [draftRepeatYearly, setDraftRepeatYearly] = useState(false);

  const resetDayOffDraft = () => {
    const today = new Date().toISOString().split("T")[0];
    setDraftStartDate(today);
    setDraftStartTime("00:00");
    setDraftEndDate(today);
    setDraftEndTime("23:59");
    setDraftReason("");
    setDraftRepeatYearly(false);
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
  const handleUpdateSlot = (dayKey: string, slotIdx: number, field: keyof DayTimeSlot, value: any) => {
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

  // Save Availability with non-overlapping multi-location conflict check
  const handleSaveAvailability = () => {
    // Check for overlap conflicts across other locations for the same user
    let conflictMessage = "";

    for (const otherLoc of locations) {
      if (otherLoc.id === selectedLocationId) continue;
      try {
        const otherSaved = localStorage.getItem(
          `mantra_user_loc_slots_${selectedUserId}_${otherLoc.id}_${activeOrganization.id}`
        );
        if (!otherSaved) continue;
        const otherSlots: WeeklySlots = JSON.parse(otherSaved);

        for (const { key, label } of WEEKDAYS) {
          const thisDay = weekSlots[key];
          const thatDay = otherSlots[key];
          if (!thisDay?.enabled || !thatDay?.enabled) continue;

          for (const sA of thisDay.slots) {
            const startA = timeToMinutes(sA.start);
            const endA = timeToMinutes(sA.end);

            for (const sB of thatDay.slots) {
              const startB = timeToMinutes(sB.start);
              const endB = timeToMinutes(sB.end);

              if (startA < endB && startB < endA) {
                conflictMessage = `Overlap detected on ${label}: ${selectedLocation.name} (${sA.start}–${sA.end}) overlaps with ${otherLoc.name} (${sB.start}–${sB.end}). A team member cannot be at two different locations at the same time.`;
                break;
              }
            }
            if (conflictMessage) break;
          }
          if (conflictMessage) break;
        }
      } catch {}
      if (conflictMessage) break;
    }

    if (conflictMessage) {
      toast.error(conflictMessage);
      return;
    }

    // Save to storage
    try {
      localStorage.setItem(
        `mantra_user_loc_slots_${selectedUserId}_${selectedLocationId}_${activeOrganization.id}`,
        JSON.stringify(weekSlots)
      );

      // Also keep legacy member location schedule sync so drawer picks it up
      const schedKey = `mantra_member_loc_schedules_${selectedUserId}_${activeOrganization.id}`;
      let legacyMap: Record<string, any> = {};
      try {
        const existing = localStorage.getItem(schedKey);
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
        isAvailableAtLocation: Object.values(convertedWorkingHours).some((x: any) => x.enabled),
        workingHours: convertedWorkingHours,
      };
      localStorage.setItem(schedKey, JSON.stringify(legacyMap));

      toast.success(`Availability saved for ${selectedUser.name} at ${selectedLocation.name}`);
    } catch (e) {
      console.error(e);
      toast.error("Failed to save availability");
    }
  };

  // Add Day Off from inline section
  const handleSaveDayOff = () => {
    if (!draftStartDate) {
      toast.error("Please select a start date");
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

    let durationStr: "All Day" | "Morning (Until 1 PM)" | "Afternoon (After 1 PM)" = "All Day";
    if (draftStartTime === "00:00" && draftEndTime === "23:59") {
      durationStr = "All Day";
    } else {
      durationStr = draftStartTime < "13:00" && draftEndTime <= "13:00" ? "Morning (Until 1 PM)" : "Afternoon (After 1 PM)";
    }

    const fullReason = [
      draftReason.trim(),
      draftRepeatYearly ? "(Repeats yearly)" : "",
    ]
      .filter(Boolean)
      .join(" ");

    const newDay: TeamMemberDayOff = {
      id: `do-${Date.now()}`,
      date: dateLabel,
      duration: durationStr,
      reason: fullReason || undefined,
    };

    const updated = [...daysOff, newDay].sort((a, b) => a.date.localeCompare(b.date));
    setDaysOff(updated);
    try {
      localStorage.setItem(daysOffKey, JSON.stringify(updated));
    } catch {}

    // Reset and remove the inline section
    resetDayOffDraft();
    setShowAddDayOffInline(false);
    toast.success(`Day off added for ${selectedUser.name} (applies across all locations)`);
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

  return (
    <div className="space-y-6">
      {/* Top Subtabs: Manage Slots | Days Off */}
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => setActiveTab("slots")}
          className={`px-4 py-1.5 text-xs font-semibold rounded-full transition-all cursor-pointer ${
            activeTab === "slots"
              ? "bg-[#1A73E8] text-white shadow-xs"
              : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
          }`}
          style={{ fontFamily: "DM Sans, sans-serif" }}
        >
          Manage Slots
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("days-off")}
          className={`px-4 py-1.5 text-xs font-semibold rounded-full transition-all cursor-pointer ${
            activeTab === "days-off"
              ? "bg-[#1A73E8] text-white shadow-xs"
              : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
          }`}
          style={{ fontFamily: "DM Sans, sans-serif" }}
        >
          Days Off
        </button>
      </div>

      {/* ==================================================================== */}
      {/* TAB 1: MANAGE SLOTS                                                  */}
      {/* ==================================================================== */}
      {activeTab === "slots" && (
        <div className="space-y-5">
          {/* Target User & Location Card */}
          <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h4 className="text-sm font-bold text-slate-900" style={{ fontFamily: "DM Sans, sans-serif" }}>
                Target User & Location
              </h4>
              <p className="text-xs text-slate-400 mt-0.5" style={{ fontFamily: "Outfit, sans-serif" }}>
                Select whose availability you are managing and for which clinic location
              </p>
            </div>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
              {/* User Dropdown */}
              <TargetUserDropdown
                selectedUserId={selectedUserId}
                onSelectUser={(userId) => setSelectedUserId(userId)}
              />

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
            </div>
          </div>

          {/* 7-Day Availability Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {WEEKDAYS.map(({ key, label }) => {
              const day = weekSlots[key] || { enabled: false, slots: [] };
              const hasSlots = day.enabled && day.slots.length > 0;

              return (
                <div
                  key={key}
                  className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-xs flex flex-col justify-between min-h-[140px] space-y-3"
                >
                  {/* Card Header */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4 text-blue-500" />
                      <span className="text-xs font-bold text-slate-900" style={{ fontFamily: "DM Sans, sans-serif" }}>
                        {label}
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleAddSlot(key)}
                      className="p-1 rounded-lg text-blue-600 hover:bg-blue-50 transition-colors cursor-pointer"
                      title={`Add slot for ${label}`}
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Card Body */}
                  <div className="flex-1 flex flex-col justify-center space-y-2">
                    {!hasSlots ? (
                      <div className="text-center py-4 text-xs font-medium text-slate-400" style={{ fontFamily: "Outfit, sans-serif" }}>
                        Unavailable
                      </div>
                    ) : (
                      day.slots.map((slot, slotIdx) => (
                        <div key={slotIdx} className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
                          {/* Start Time */}
                          <select
                            value={slot.start}
                            onChange={(e) => handleUpdateSlot(key, slotIdx, "start", e.target.value)}
                            className="px-2 py-1 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-primary bg-white text-slate-800 font-medium cursor-pointer"
                          >
                            {TIME_OPTIONS.map((t) => (
                              <option key={t} value={t}>
                                {t}
                              </option>
                            ))}
                          </select>

                          <span className="text-xs text-slate-400">–</span>

                          {/* End Time */}
                          <select
                            value={slot.end}
                            onChange={(e) => handleUpdateSlot(key, slotIdx, "end", e.target.value)}
                            className="px-2 py-1 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-primary bg-white text-slate-800 font-medium cursor-pointer"
                          >
                            {TIME_OPTIONS.map((t) => (
                              <option key={t} value={t}>
                                {t}
                              </option>
                            ))}
                          </select>

                          {/* Slot Duration */}
                          <select
                            value={slot.durationMinutes}
                            onChange={(e) => handleUpdateSlot(key, slotIdx, "durationMinutes", Number(e.target.value))}
                            className="px-2 py-1 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-primary bg-white text-slate-600 font-medium cursor-pointer"
                          >
                            {DURATION_OPTIONS.map((d) => (
                              <option key={d.value} value={d.value}>
                                {d.label}
                              </option>
                            ))}
                          </select>

                          {/* Delete Slot */}
                          <button
                            type="button"
                            onClick={() => handleRemoveSlot(key, slotIdx)}
                            className="p-1 text-slate-400 hover:text-rose-600 transition-colors cursor-pointer ml-auto"
                            title="Remove slot"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Bottom Save Action */}
          <div className="flex justify-end pt-2">
            <button
              type="button"
              onClick={handleSaveAvailability}
              className="px-6 py-2.5 rounded-xl bg-[#1A73E8] hover:bg-blue-700 text-white font-semibold text-xs transition-all shadow-xs cursor-pointer"
              style={{ fontFamily: "Outfit, sans-serif" }}
            >
              Save Availability
            </button>
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* TAB 2: DAYS OFF (Common across all locations)                         */}
      {/* ==================================================================== */}
      {activeTab === "days-off" && (
        <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs p-6 space-y-6">
          {/* Target User Box inside the card */}
          <div className="rounded-2xl p-4 sm:p-5 border border-slate-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white">
            <div>
              <h4 className="text-sm font-bold text-slate-900" style={{ fontFamily: "DM Sans, sans-serif" }}>
                Target User
              </h4>
              <p className="text-xs text-slate-400 mt-0.5" style={{ fontFamily: "Outfit, sans-serif" }}>
                Manage days off for a specific team member
              </p>
            </div>

            <TargetUserDropdown
              selectedUserId={selectedUserId}
              onSelectUser={(userId) => setSelectedUserId(userId)}
            />
          </div>

          {/* Scheduled Days Off Section */}
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-start gap-2.5">
                <div className="w-5 h-5 text-[#1A73E8] flex items-center justify-center shrink-0 mt-0.5">
                  <Calendar className="w-4 h-4 text-[#1A73E8]" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-slate-900" style={{ fontFamily: "DM Sans, sans-serif" }}>
                    Scheduled Days Off
                  </h4>
                  <p className="text-xs text-slate-400 mt-0.5" style={{ fontFamily: "Outfit, sans-serif" }}>
                    Block out entire days where no appointments can be booked
                  </p>
                </div>
              </div>

              {!showAddDayOffInline && (
                <button
                  type="button"
                  onClick={() => setShowAddDayOffInline(true)}
                  className="flex items-center gap-1.5 px-4 py-2 bg-[#1A73E8] hover:bg-blue-700 text-white rounded-full text-xs font-semibold transition-all cursor-pointer shadow-2xs self-start sm:self-auto"
                  style={{ fontFamily: "Outfit, sans-serif" }}
                >
                  <Plus className="w-3.5 h-3.5" />
                  Add Day Off
                </button>
              )}
            </div>

            {/* Divider Line directly under header */}
            <div className="border-b border-slate-100" />

            {/* INLINE NEW DAY OFF SECTION */}
            {showAddDayOffInline && (
              <div className="p-5 rounded-2xl border border-slate-200 bg-[#fbfcfd] shadow-2xs space-y-4 animate-in fade-in duration-200">
                <h5 className="text-xs font-bold text-[#1A73E8]" style={{ fontFamily: "DM Sans, sans-serif" }}>
                  New Day Off
                </h5>

                {/* Dates and Times Row */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 items-end">
                  {/* Start Date */}
                  <div>
                    <label className="text-[11px] text-slate-500 font-medium block mb-1.5" style={{ fontFamily: "Outfit, sans-serif" }}>
                      Start Date
                    </label>
                    <input
                      type="date"
                      value={draftStartDate}
                      onChange={(e) => setDraftStartDate(e.target.value)}
                      className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary text-slate-800"
                    />
                  </div>

                  {/* Start Time */}
                  <div>
                    <label className="text-[11px] text-slate-500 font-medium block mb-1.5" style={{ fontFamily: "Outfit, sans-serif" }}>
                      Time
                    </label>
                    <input
                      type="time"
                      value={draftStartTime}
                      onChange={(e) => setDraftStartTime(e.target.value)}
                      className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary text-slate-800"
                    />
                  </div>

                  {/* End Date */}
                  <div>
                    <label className="text-[11px] text-slate-500 font-medium block mb-1.5" style={{ fontFamily: "Outfit, sans-serif" }}>
                      End Date
                    </label>
                    <input
                      type="date"
                      value={draftEndDate}
                      onChange={(e) => setDraftEndDate(e.target.value)}
                      className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary text-slate-800"
                    />
                  </div>

                  {/* End Time */}
                  <div>
                    <label className="text-[11px] text-slate-500 font-medium block mb-1.5" style={{ fontFamily: "Outfit, sans-serif" }}>
                      Time
                    </label>
                    <input
                      type="time"
                      value={draftEndTime}
                      onChange={(e) => setDraftEndTime(e.target.value)}
                      className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary text-slate-800"
                    />
                  </div>
                </div>

                {/* Reason (Optional) - Full Width rounded input */}
                <div>
                  <label className="text-[11px] text-slate-500 font-medium block mb-1.5" style={{ fontFamily: "Outfit, sans-serif" }}>
                    Reason (Optional)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Vacation, Public Holiday"
                    value={draftReason}
                    onChange={(e) => setDraftReason(e.target.value)}
                    className="w-full px-4 py-2.5 text-xs bg-white border border-slate-200 rounded-full focus:outline-none focus:ring-2 focus:ring-primary text-slate-800 placeholder:text-slate-400"
                    style={{ fontFamily: "Outfit, sans-serif" }}
                  />
                </div>

                {/* Repeat Yearly Checkbox */}
                <div className="flex items-center gap-2 pt-0.5">
                  <input
                    type="checkbox"
                    id="repeat-yearly"
                    checked={draftRepeatYearly}
                    onChange={(e) => setDraftRepeatYearly(e.target.checked)}
                    className="w-4 h-4 rounded border-slate-300 text-primary focus:ring-primary cursor-pointer"
                  />
                  <label
                    htmlFor="repeat-yearly"
                    className="text-xs text-slate-600 select-none cursor-pointer"
                    style={{ fontFamily: "Outfit, sans-serif" }}
                  >
                    Repeat yearly
                  </label>
                </div>

                {/* Actions: Cancel & Save Day Off */}
                <div className="flex items-center justify-end gap-2.5 pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      resetDayOffDraft();
                      setShowAddDayOffInline(false);
                    }}
                    className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 border border-slate-200 rounded-full hover:bg-slate-50 transition-colors cursor-pointer bg-white"
                    style={{ fontFamily: "Outfit, sans-serif" }}
                  >
                    Cancel
                  </button>

                  <button
                    type="button"
                    onClick={handleSaveDayOff}
                    className="px-5 py-2 text-xs font-semibold text-white bg-[#1A73E8] hover:bg-blue-700 rounded-full shadow-xs transition-colors cursor-pointer"
                    style={{ fontFamily: "Outfit, sans-serif" }}
                  >
                    Save Day Off
                  </button>
                </div>
              </div>
            )}

            {/* Days Off Content: Empty state or Cards matching screenshot */}
            {daysOff.length === 0 ? (
              <div className="text-center py-16 border border-dashed border-slate-200 rounded-2xl bg-slate-50/50">
                <div className="w-12 h-12 rounded-2xl bg-white border border-slate-200 flex items-center justify-center mx-auto mb-3 shadow-2xs text-slate-400">
                  <CalendarOff className="w-6 h-6" />
                </div>
                <h5 className="text-sm font-bold text-slate-800">
                  No days off scheduled
                </h5>
                <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto" style={{ fontFamily: "Outfit, sans-serif" }}>
                  You haven&apos;t set any days off. You are available during your regular slot hours.
                </p>
              </div>
            ) : (
              <div className="flex flex-wrap gap-3">
                {daysOff.map((d) => (
                  <div
                    key={d.id}
                    className="group relative bg-[#f8f9fa] hover:bg-slate-100/80 rounded-2xl px-5 py-4 w-fit min-w-[280px] max-w-[340px] transition-all flex items-start justify-between gap-3 cursor-default"
                  >
                    <div>
                      <div className="text-xs font-semibold text-slate-800" style={{ fontFamily: "DM Sans, sans-serif" }}>
                        {formatDisplayDayOff(d.date)}
                      </div>
                      <div className="text-[11px] text-slate-400 mt-1" style={{ fontFamily: "Outfit, sans-serif" }}>
                        {d.reason || "No reason specified"}
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleRemoveDayOff(d.id)}
                      className="opacity-0 group-hover:opacity-100 p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all cursor-pointer shrink-0 ml-2"
                      title="Remove Day Off"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
