import React, { useState, useEffect, useMemo } from "react";
import { useOutletContext } from "react-router";
import {
  Calendar,
  Clock,
  User,
  CheckCircle2,
  Stethoscope,
  MapPin,
  Building2,
  Plus,
  X,
  ChevronRight,
  ChevronLeft,
  ArrowLeft,
  ShieldCheck,
  Check,
  Layers,
  UserCheck,
  Navigation,
  AlertTriangle,
} from "lucide-react";
import { Client, getStoredClients, saveStoredClients } from "../../../lib/clientsStore";
import { Process, Stage } from "../../../lib/useProcessStore";
import { appointmentService, Appointment } from "../../../lib/appointmentService";
import { getStoredTeamMembers } from "../../../lib/teamStore";
import { getStoredServices } from "../../../lib/servicesStore";
import { findRoomForAppointment } from "../../../lib/roomsStore";
import { useOrganization } from "../../context/OrganizationContext";
import {
  getServiceSlots,
  isServiceEnabledAtLocation,
  timeToMinutes,
  LocationWithHours,
} from "../../../lib/serviceAvailability";
import { toast } from "sonner";

interface PortalContext {
  activeClient: Client;
  activeProcess?: Process;
  currentStageName?: string;
  currentStageIndex?: number;
  stages?: Stage[];
  onStageChange?: (newStageName: string) => void;
}

export default function PatientBookingScreen() {
  const { activeClient } = useOutletContext<PortalContext>();
  const { activeOrganization } = useOrganization();

  const [activeTab, setActiveTab] = useState<"upcoming" | "past">("upcoming");

  // ── 1. Fetch User's Appointments ──
  const [appointments, setAppointments] = useState<Appointment[]>(() => {
    if (!activeClient) return [];
    const all = appointmentService.getAppointments();
    return all.filter(
      (a) =>
        (activeClient.id && String(a.clientId) === String(activeClient.id)) ||
        (activeClient.email && a.clientEmail?.toLowerCase() === activeClient.email.toLowerCase()) ||
        (activeClient.name && a.clientName?.toLowerCase() === activeClient.name.toLowerCase()) ||
        (activeClient.phone &&
          a.clientPhone &&
          a.clientPhone.replace(/\D/g, "") === activeClient.phone.replace(/\D/g, ""))
    );
  });

  useEffect(() => {
    return appointmentService.subscribe((all) => {
      if (!activeClient) return;
      const userApts = all.filter(
        (a) =>
          (activeClient.id && String(a.clientId) === String(activeClient.id)) ||
          (activeClient.email && a.clientEmail?.toLowerCase() === activeClient.email.toLowerCase()) ||
          (activeClient.name && a.clientName?.toLowerCase() === activeClient.name.toLowerCase()) ||
          (activeClient.phone &&
            a.clientPhone &&
            a.clientPhone.replace(/\D/g, "") === activeClient.phone.replace(/\D/g, ""))
      );
      setAppointments(userApts);
    });
  }, [activeClient?.id]);

  // ── 2. Data Sources (Services, Locations, Team) ──
  const services = useMemo(() => {
    const list = getStoredServices();
    return list.filter((s) => s.availableForAppointment === true && s.isActive !== false);
  }, []);

  const fullOrgLocations = useMemo<LocationWithHours[]>(() => {
    const list: LocationWithHours[] = [];
    const seen = new Set<string>();

    try {
      const saved = localStorage.getItem(`mantra_org_locations_${activeOrganization.id}`);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          parsed.forEach((l: any, idx: number) => {
            if (l.name && !seen.has(l.name.toLowerCase())) {
              seen.add(l.name.toLowerCase());
              list.push({
                id: l.id || `loc-${idx + 1}`,
                name: l.name,
                address: l.address,
                phone: l.phone,
                timezone: l.timezone,
                type: l.type,
                workingHours: l.workingHours,
                daysOff: l.daysOff,
              });
            }
          });
        }
      }
    } catch { /* ignore */ }

    if (list.length === 0) {
      const locNames = activeOrganization.locations && activeOrganization.locations.length > 0
        ? activeOrganization.locations
        : [activeOrganization.location || "California"];

      locNames.forEach((name, idx) => {
        const isOnline = name.toLowerCase() === "online" || name.toLowerCase().includes("virtual");
        const formatted = isOnline
          ? "Online"
          : name.includes("Center") || name.includes("Clinic") || name.includes("Branch")
          ? name
          : `${name} Branch`;
        if (!seen.has(formatted.toLowerCase())) {
          seen.add(formatted.toLowerCase());
          list.push({
            id: `loc-${idx + 1}`,
            name: formatted,
            type: isOnline ? "online" : "physical",
            workingHours: {
              monday: { enabled: true, start: "09:00", end: "18:00" },
              tuesday: { enabled: true, start: "09:00", end: "18:00" },
              wednesday: { enabled: true, start: "09:00", end: "18:00" },
              thursday: { enabled: true, start: "09:00", end: "18:00" },
              friday: { enabled: true, start: "09:00", end: "18:00" },
              saturday: { enabled: true, start: "09:00", end: "17:00" },
              sunday: { enabled: false },
            },
          });
        }
      });
    }

    return list;
  }, [activeOrganization]);

  const team = useMemo(() => {
    return getStoredTeamMembers().filter((m) => m.status !== false && m.canBookAppointments !== false);
  }, []);

  // ── 3. Booking Modal State ──
  const [showBookingModal, setShowBookingModal] = useState(false);
  const [bookingStep, setBookingStep] = useState<1 | 2>(1);
  const [weekOffset, setWeekOffset] = useState(0);
  const [selectedServiceId, setSelectedServiceId] = useState<string>(() => String(services[0]?.id || ""));
  const [selectedLocation, setSelectedLocation] = useState<string>(() => fullOrgLocations[0]?.name || "California");
  const [selectedDoctorId, setSelectedDoctorId] = useState<string>(""); // "" = Any Available Staff (slot-wise)
  const bookingType: "service" | "specialist" = selectedDoctorId ? "specialist" : "service";
  const [date, setDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [selectedTime, setSelectedTime] = useState("09:00 AM");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Timezone string e.g. "(GMT+05:30) Asia/Calcutta"
  const userTimezoneLabel = useMemo(() => {
    try {
      const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || "Asia/Calcutta";
      const offsetMin = -new Date().getTimezoneOffset();
      const sign = offsetMin >= 0 ? "+" : "-";
      const hours = String(Math.floor(Math.abs(offsetMin) / 60)).padStart(2, "0");
      const mins = String(Math.abs(offsetMin) % 60).padStart(2, "0");
      return `(GMT${sign}${hours}:${mins}) ${tz}`;
    } catch {
      return "(GMT+05:30) Asia/Calcutta";
    }
  }, []);

  // 7 Days starting from (today + weekOffset * 7)
  const weekDays = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const baseDate = new Date(today);
    baseDate.setDate(today.getDate() + weekOffset * 7);

    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

    const list: Array<{
      fullDateStr: string;
      dayOfWeek: string;
      dayNum: string;
      monthStr: string;
      isPast: boolean;
      isToday: boolean;
    }> = [];

    for (let i = 0; i < 7; i++) {
      const d = new Date(baseDate);
      d.setDate(baseDate.getDate() + i);
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, "0");
      const day = String(d.getDate()).padStart(2, "0");
      const fullDateStr = `${y}-${m}-${day}`;

      const compareDate = new Date(d);
      compareDate.setHours(0, 0, 0, 0);
      const isPast = compareDate < today;
      const isToday = fullDateStr === new Date().toISOString().split("T")[0];

      list.push({
        fullDateStr,
        dayOfWeek: dayNames[d.getDay()],
        dayNum: String(d.getDate()),
        monthStr: monthNames[d.getMonth()],
        isPast,
        isToday,
      });
    }

    return list;
  }, [weekOffset]);

  // Auto-sync service selection
  useEffect(() => {
    if (services.length > 0 && (!selectedServiceId || !services.some((s) => String(s.id) === String(selectedServiceId)))) {
      setSelectedServiceId(String(services[0].id));
    }
  }, [services, selectedServiceId]);

  const selectedServiceObj = useMemo(() => {
    return services.find((s) => String(s.id) === String(selectedServiceId)) || services[0];
  }, [services, selectedServiceId]);

  const selectedDoctorObj = useMemo(() => {
    if (!selectedDoctorId) return null;
    return team.find((d) => String(d.id) === String(selectedDoctorId)) || null;
  }, [team, selectedDoctorId]);

  // ── Available Doctors for the Selected Service (matches MA ScheduleAppointmentDrawer) ──
  const serviceResponsibleDoctors = useMemo(() => {
    const srv = selectedServiceObj;
    if (srv) {
      if (srv.locationEmployees && selectedLocation) {
        const selectedLocName = selectedLocation.toLowerCase().trim();
        const matchedLocObj = fullOrgLocations.find((ol) => ol.name.toLowerCase() === selectedLocName);
        const locEmps = srv.locationEmployees[matchedLocObj?.id || ""] ||
                        srv.locationEmployees[selectedLocation] ||
                        srv.locationEmployees[selectedLocName];
        if (Array.isArray(locEmps) && locEmps.length > 0) {
          const locEmpIds = new Set(locEmps.map(String));
          const matched = team.filter((e) => locEmpIds.has(String(e.id)));
          if (matched.length > 0) return matched;
        }
      }
      if (srv.assignedEmployees && srv.assignedEmployees.length > 0) {
        const assignedIds = new Set(srv.assignedEmployees.map(String));
        const matched = team.filter((e) => assignedIds.has(String(e.id)));
        if (matched.length > 0) return matched;
      }
    }
    return team;
  }, [selectedServiceObj, selectedLocation, fullOrgLocations, team]);

  // Available locations for current service
  const availableLocations = useMemo(() => {
    if (!selectedServiceObj) return fullOrgLocations;
    if (!selectedServiceObj.locationIds || selectedServiceObj.locationIds.length === 0) {
      return fullOrgLocations;
    }
    const matched = fullOrgLocations.filter((loc) => isServiceEnabledAtLocation(selectedServiceObj, loc));
    return matched.length > 0 ? matched : fullOrgLocations;
  }, [selectedServiceObj, fullOrgLocations]);

  // Auto-sync location if current location is not valid for service
  useEffect(() => {
    if (availableLocations.length > 0 && !availableLocations.some((l) => l.name.toLowerCase() === selectedLocation.toLowerCase())) {
      setSelectedLocation(availableLocations[0].name);
    }
  }, [availableLocations, selectedLocation]);

  // Sync doctor when service or location changes: if chosen doctor is no longer in responsible list, clear selection
  useEffect(() => {
    if (selectedDoctorId && serviceResponsibleDoctors.length > 0) {
      const isCurrentValid = serviceResponsibleDoctors.some((d) => String(d.id) === String(selectedDoctorId));
      if (!isCurrentValid) {
        setSelectedDoctorId("");
      }
    }
  }, [serviceResponsibleDoctors, selectedDoctorId]);

  // ── Dynamic Room Allocation ──
  const allocatedRoom = useMemo(() => {
    if (bookingType === "service") {
      return findRoomForAppointment({
        serviceId: selectedServiceId,
        location: selectedLocation,
      });
    }
    return findRoomForAppointment({
      serviceId: selectedServiceId,
      location: selectedLocation,
      employeeId: selectedDoctorId,
      employeeName: selectedDoctorObj?.name,
    });
  }, [bookingType, selectedServiceId, selectedLocation, selectedDoctorId, selectedDoctorObj]);

  // ── 4. Dynamic Slot Calculation (Identical to MA Logic) ──
  // A. Service Mode Slots (Driven by Service & Location availability and capacity)
  const serviceModeSlots = useMemo(() => {
    if (bookingType !== "service" || !selectedServiceObj || !selectedLocation || !date) {
      return [];
    }
    const loc = fullOrgLocations.find((l) => l.name.toLowerCase() === selectedLocation.toLowerCase());
    if (!loc) return [];
    try {
      const allAppts = appointmentService.getAppointments();
      return getServiceSlots(selectedServiceObj as any, loc, date, allAppts);
    } catch {
      return [];
    }
  }, [bookingType, selectedServiceObj, selectedLocation, date, fullOrgLocations]);

  // B. Specialist Mode Slots (Driven by Doctor working hours & booked appointments)
  const specialistSlots = useMemo(() => {
    if (bookingType !== "specialist" || !selectedDoctorId || !date) {
      return { slots: [], notice: null };
    }

    const doc = selectedDoctorObj;
    if (!doc) return { slots: [], notice: null };

    // 1. Check doctor's common days off
    try {
      const daysOffSaved = localStorage.getItem(
        `mantra_member_common_days_off_${doc.id}_${activeOrganization.id}`
      );
      if (daysOffSaved) {
        const daysOff = JSON.parse(daysOffSaved);
        if (Array.isArray(daysOff)) {
          const match = daysOff.find((d: any) => d.date === date);
          if (match && match.duration === "Full Day") {
            return {
              slots: [],
              notice: `${doc.name} is on leave on this date (${match.label || "Day Off"}).`,
            };
          }
        }
      }
    } catch {}

    // 2. Day of week & hours
    const [yr, mo, dy] = date.split("-").map(Number);
    const dateObj = new Date(yr, (mo || 1) - 1, dy || 1);
    const dayNames = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
    const dayKey = dayNames[dateObj.getDay()];

    let startMin = 9 * 60; // 09:00 AM
    let endMin = 17 * 60;  // 05:00 PM
    let isDayEnabled = true;

    const targetLocObj = fullOrgLocations.find((l) => l.name.toLowerCase() === selectedLocation.toLowerCase());
    const locId = targetLocObj?.id || "loc-1";

    if (selectedServiceObj && targetLocObj && !isServiceEnabledAtLocation(selectedServiceObj, targetLocObj)) {
      return {
        slots: [],
        notice: `${selectedServiceObj.name} is not offered at ${targetLocObj.name}.`,
      };
    }

    if (targetLocObj) {
      if (targetLocObj.daysOff && Array.isArray(targetLocObj.daysOff)) {
        const isLocDayOff = targetLocObj.daysOff.some((d: any) => d.date === date);
        if (isLocDayOff) {
          return {
            slots: [],
            notice: `${targetLocObj.name} is closed on this date.`,
          };
        }
      }

      if (targetLocObj.workingHours && targetLocObj.workingHours[dayKey]) {
        const locWh = targetLocObj.workingHours[dayKey];
        if (locWh.enabled === false) {
          return {
            slots: [],
            notice: `${targetLocObj.name} is closed on ${dayKey.charAt(0).toUpperCase() + dayKey.slice(1)}s.`,
          };
        }
        if (locWh.start) startMin = Math.max(startMin, timeToMinutes(locWh.start));
        if (locWh.end) endMin = Math.min(endMin, timeToMinutes(locWh.end));
      }
    }

    try {
      const savedUserSlots = localStorage.getItem(
        `mantra_user_loc_slots_${doc.id}_${locId}_${activeOrganization.id}`
      );
      if (savedUserSlots) {
        const parsed = JSON.parse(savedUserSlots);
        const dayAvail = parsed[dayKey];
        if (dayAvail) {
          isDayEnabled = dayAvail.enabled;
          if (dayAvail.slots && dayAvail.slots.length > 0) {
            const firstSlot = dayAvail.slots[0];
            const [sh, sm] = firstSlot.start.split(":").map(Number);
            const [eh, em] = firstSlot.end.split(":").map(Number);
            startMin = sh * 60 + sm;
            endMin = eh * 60 + em;
          }
        }
      }
    } catch {}

    if (!isDayEnabled && (doc.name.toLowerCase().includes("admin") || String(doc.id) === "1")) {
      isDayEnabled = true;
    }

    if (!isDayEnabled) {
      return {
        slots: [],
        notice: `${doc.name} is not scheduled to work on ${dayKey.charAt(0).toUpperCase() + dayKey.slice(1)}s.`,
      };
    }

    // Booked times for this doctor
    const bookedTimes = new Set<string>();
    try {
      const allAppts = appointmentService.getAppointments();
      allAppts.forEach((apt) => {
        if (
          apt.date === date &&
          String(apt.employeeId) === String(doc.id) &&
          apt.status !== "cancelled" &&
          apt.time
        ) {
          const [ah, am] = apt.time.split(":").map(Number);
          bookedTimes.add(`${String(ah).padStart(2, "0")}:${String(am).padStart(2, "0")}`);
        }
      });
    } catch {}

    const duration = selectedServiceObj?.slotDuration || selectedServiceObj?.duration || 30;
    const slots: Array<{
      hour: number;
      minute: number;
      timeStr: string;
      label12: string;
      disabled: boolean;
      isServiceSlot: false;
    }> = [];

    for (let current = startMin; current + duration <= endMin; current += duration) {
      const h = Math.floor(current / 60);
      const m = current % 60;
      const timeStr = `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
      const p = h >= 12 ? "PM" : "AM";
      const h12 = h % 12 === 0 ? 12 : h % 12;
      const label12 = `${h12}:${String(m).padStart(2, "0")} ${p}`;
      const isBooked = bookedTimes.has(timeStr);

      slots.push({
        hour: h,
        minute: m,
        timeStr,
        label12,
        disabled: isBooked,
        isServiceSlot: false,
      });
    }

    return { slots, notice: null };
  }, [bookingType, selectedDoctorId, selectedDoctorObj, date, selectedLocation, selectedServiceObj, fullOrgLocations, activeOrganization.id]);

  // Combined Active Slots
  const activeSlots = useMemo(() => {
    if (bookingType === "service") {
      return serviceModeSlots.map((s) => ({
        hour: s.hour,
        minute: s.minute,
        timeStr: s.timeStr,
        label12: s.label12,
        disabled: s.isFull,
        remaining: s.remaining,
        isServiceSlot: true as const,
      }));
    }
    return specialistSlots.slots.map((s) => ({
      hour: s.hour,
      minute: s.minute,
      timeStr: s.timeStr,
      label12: s.label12,
      disabled: s.disabled,
      remaining: undefined,
      isServiceSlot: false as const,
    }));
  }, [bookingType, serviceModeSlots, specialistSlots]);

  // Only show slots that are actually available in the patient portal (hide booked / full slots)
  const availableSlotsForPatient = useMemo(() => {
    return activeSlots.filter((slot) => !slot.disabled);
  }, [activeSlots]);

  // Auto-select first available slot when slots change
  useEffect(() => {
    if (availableSlotsForPatient.length > 0) {
      const matchesCurrent = availableSlotsForPatient.some((s) => s.label12 === selectedTime);
      if (!matchesCurrent) {
        setSelectedTime(availableSlotsForPatient[0].label12);
      }
    }
  }, [availableSlotsForPatient, selectedTime]);

  const slotNotice = bookingType === "specialist" ? specialistSlots.notice : null;

  const handleCreateBooking = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeClient) return;

    setIsSubmitting(true);
    try {
      const title = bookingType === "service"
        ? `${selectedServiceObj?.name || "Consultation"} Consultation`
        : `${selectedServiceObj?.name || "Consultation"} with ${selectedDoctorObj?.name || "Doctor"}`;

      let assignedEmpId: number | undefined = undefined;
      if (selectedDoctorId) {
        assignedEmpId = Number(selectedDoctorId) || Number(selectedDoctorObj?.id) || undefined;
      } else if (selectedServiceObj?.assignedEmployees && selectedServiceObj.assignedEmployees.length > 0) {
        assignedEmpId = Number(selectedServiceObj.assignedEmployees[0]) || undefined;
      }

      appointmentService.createAppointment(
        {
          clientName: activeClient.name,
          clientEmail: activeClient.email || "patient@example.com",
          clientPhone: activeClient.phone || "+1 (555) 123-4567",
          clientId: activeClient.id,
          employeeId: assignedEmpId,
          serviceId: Number(selectedServiceObj?.id) || 1,
          location: selectedLocation,
          date,
          time: selectedTime,
          duration: selectedServiceObj?.slotDuration || selectedServiceObj?.duration || 30,
          title,
          roomNumber: allocatedRoom?.roomNumber,
          roomStationId: allocatedRoom?.id,
          roomName: allocatedRoom?.name,
          bookingType,
          source: "MA-Client",
        },
        { force: true, createdBy: "user" }
      );

      // Advance patient stage in clientsStore if needed
      const all = getStoredClients();
      const updated = all.map((c) =>
        c.id === activeClient.id
          ? {
              ...c,
              stage: "Client Checked In",
              processes: Array.from(new Set(["Patient Care Journey", ...(c.processes || [])])),
            }
          : c
      );
      saveStoredClients(updated);

      toast.success("Appointment booked successfully!");
      setShowBookingModal(false);
    } catch {
      toast.error("Failed to book appointment. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const upcomingAppts = appointments.filter((a) => a.status !== "completed" && a.status !== "cancelled");
  const pastAppts = appointments.filter((a) => a.status === "completed" || a.status === "cancelled");
  const displayAppts = activeTab === "upcoming" ? upcomingAppts : pastAppts;

  return (
    <div className="max-w-2xl mx-auto space-y-6 pb-12 animate-in fade-in duration-200">
      {/* ── Page Header ── */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Visits</h1>
        </div>

        <button
          type="button"
          onClick={() => {
            setBookingStep(1);
            setWeekOffset(0);
            setShowBookingModal(true);
          }}
          className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-sm shadow-blue-500/25 transition-all cursor-pointer active:scale-95"
        >
          <Plus className="w-4 h-4" />
          <span>Book Appointment</span>
        </button>
      </div>

      {/* ── Tab Switcher: Upcoming vs Past ── */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-1">
        <button
          type="button"
          onClick={() => setActiveTab("upcoming")}
          className={`pb-2 px-3 text-xs font-bold transition-colors cursor-pointer border-b-2 -mb-1 ${
            activeTab === "upcoming"
              ? "border-blue-600 text-blue-600"
              : "border-transparent text-slate-400 hover:text-slate-600"
          }`}
          style={{ fontFamily: "Outfit, sans-serif" }}
        >
          Upcoming ({upcomingAppts.length})
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("past")}
          className={`pb-2 px-3 text-xs font-bold transition-colors cursor-pointer border-b-2 -mb-1 ${
            activeTab === "past"
              ? "border-blue-600 text-blue-600"
              : "border-transparent text-slate-400 hover:text-slate-600"
          }`}
          style={{ fontFamily: "Outfit, sans-serif" }}
        >
          Past ({pastAppts.length})
        </button>
      </div>

      {/* ── Appointment List ── */}
      {displayAppts.length === 0 ? (
        <div className="p-12 text-center bg-white rounded-3xl border border-slate-200/80 shadow-xs space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-center mx-auto text-slate-400">
            <Calendar className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-800" style={{ fontFamily: "Outfit, sans-serif" }}>
              No {activeTab} visits
            </h3>
            <p className="text-xs text-slate-400 mt-1" style={{ fontFamily: "DM Sans, sans-serif" }}>
              {activeTab === "upcoming"
                ? "You have no upcoming consultations scheduled."
                : "You don't have any past appointment records."}
            </p>
          </div>
          {activeTab === "upcoming" && (
            <button
              type="button"
              onClick={() => setShowBookingModal(true)}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs shadow-xs transition-all cursor-pointer"
              style={{ fontFamily: "Outfit, sans-serif" }}
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Schedule Now</span>
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {displayAppts.map((appt) => {
            const roomAllocated = findRoomForAppointment({
              serviceId: appt.serviceId,
              location: appt.location,
              employeeId: appt.employeeId,
            });

            return (
              <div
                key={appt.id}
                className="p-5 bg-white rounded-3xl border border-slate-200/80 shadow-xs hover:border-slate-300 transition-all space-y-3"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-1">
                    <span className="text-[10px] font-bold tracking-wider uppercase text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-200/60">
                      {appt.serviceName || (appt.bookingType === "service" ? "Service Visit" : "Consultation")}
                    </span>
                    <h3 className="text-base font-bold text-slate-900" style={{ fontFamily: "Outfit, sans-serif" }}>
                      {appt.title || "Clinical Appointment"}
                    </h3>
                  </div>

                  <span
                    className={`text-[11px] font-bold px-2.5 py-1 rounded-full border shrink-0 ${
                      appt.status === "completed"
                        ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                        : appt.status === "cancelled" || appt.status === "no-show"
                        ? "bg-rose-50 text-rose-700 border-rose-200"
                        : "bg-blue-50 text-blue-700 border-blue-200"
                    }`}
                    style={{ fontFamily: "Outfit, sans-serif" }}
                  >
                    {appt.statusLabel || (appt.status === "no-show" ? "No Show" : appt.status)}
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2 border-t border-slate-100 text-xs text-slate-600" style={{ fontFamily: "DM Sans, sans-serif" }}>
                  <div className="flex items-center gap-2">
                    <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span className="font-semibold text-slate-800">{appt.date}</span>
                    <span className="text-slate-400">·</span>
                    <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span>{appt.time}</span>
                  </div>

                  {appt.employeeName && (
                    <div className="flex items-center gap-2">
                      <User className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span>Physician: <strong className="text-slate-800">{appt.employeeName}</strong></span>
                    </div>
                  )}

                  <div className="flex items-center gap-2">
                    <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span>{appt.location || "California Branch"}</span>
                  </div>

                  <div className="flex items-center gap-2">
                    <Building2 className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                    <span>
                      Room:{" "}
                      <strong className="text-blue-700 font-bold">
                        {appt.roomNumber ? `Room ${appt.roomNumber}` : roomAllocated ? `Room ${roomAllocated.roomNumber} (${roomAllocated.name})` : "General Station"}
                      </strong>
                    </span>
                  </div>
                </div>

                {roomAllocated?.direction && (
                  <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100 flex items-start gap-2 text-xs text-slate-600">
                    <Navigation className="w-3.5 h-3.5 text-blue-600 shrink-0 mt-0.5" />
                    <span>
                      <strong className="text-slate-700">Walking Guidance:</strong> {roomAllocated.direction}
                    </span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* ── Book Appointment Modal (Matches MA Drawer Logic Exactly) ── */}
      {showBookingModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
            {/* Modal Header */}
            {bookingStep === 1 ? (
              <div className="p-5 sm:p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
                <div className="space-y-0.5">
                  <h3 className="text-lg font-bold text-slate-900" style={{ fontFamily: "Outfit, sans-serif" }}>
                    Schedule Appointment
                  </h3>
                  <p className="text-xs text-slate-500 font-medium">
                    Step 1 of 2: Select service, clinic location & doctor
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowBookingModal(false)}
                  className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            ) : (
              <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-white">
                <button
                  type="button"
                  onClick={() => setBookingStep(1)}
                  className="inline-flex items-center gap-1.5 py-1 px-2.5 -ml-1 rounded-xl text-xs font-bold text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors cursor-pointer"
                  style={{ fontFamily: "Outfit, sans-serif" }}
                >
                  <ArrowLeft className="w-4 h-4 text-slate-500" />
                  <span>Back</span>
                </button>

                <h3 className="text-base font-bold text-slate-900" style={{ fontFamily: "Outfit, sans-serif" }}>
                  Schedule Appointment
                </h3>

                <button
                  type="button"
                  onClick={() => setShowBookingModal(false)}
                  className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            )}

            {/* Modal Form */}
            <form onSubmit={handleCreateBooking} className="p-5 sm:p-6 overflow-y-auto space-y-4">
              {bookingStep === 1 ? (
                <>
                  {/* 1. Service Selection */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5" style={{ fontFamily: "Outfit, sans-serif" }}>
                      <Layers className="w-3.5 h-3.5 text-blue-600" />
                      <span>Service <span className="text-rose-500">*</span></span>
                    </label>
                    {services.length === 0 ? (
                      <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-700">
                        No services currently available for appointments.
                      </div>
                    ) : (
                      <select
                        value={selectedServiceId}
                        onChange={(e) => setSelectedServiceId(e.target.value)}
                        className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 cursor-pointer"
                        style={{ fontFamily: "Outfit, sans-serif" }}
                      >
                        {services.map((srv) => (
                          <option key={srv.id} value={srv.id}>
                            {srv.name} ({srv.slotDuration || srv.duration || 30} mins) — ${srv.price || 75}
                          </option>
                        ))}
                      </select>
                    )}
                  </div>

                  {/* 2. Facility Location (Follows Service) */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5" style={{ fontFamily: "Outfit, sans-serif" }}>
                      <MapPin className="w-3.5 h-3.5 text-blue-600" />
                      <span>Facility Location <span className="text-rose-500">*</span></span>
                    </label>
                    <select
                      value={selectedLocation}
                      onChange={(e) => setSelectedLocation(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 cursor-pointer"
                      style={{ fontFamily: "Outfit, sans-serif" }}
                    >
                      {availableLocations.map((loc) => (
                        <option key={loc.id || loc.name} value={loc.name}>
                          {loc.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* 3. Responsible Practitioner / Specialist (Optional) */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5" style={{ fontFamily: "Outfit, sans-serif" }}>
                        <UserCheck className="w-3.5 h-3.5 text-emerald-600" />
                        <span>Responsible Practitioner <span className="text-[10px] font-normal text-slate-400">(Optional)</span></span>
                      </label>
                      {serviceResponsibleDoctors.length > 0 && (
                        <span className="text-[10px] text-slate-400 font-medium">
                          ({serviceResponsibleDoctors.length} available)
                        </span>
                      )}
                    </div>
                    <select
                      value={selectedDoctorId}
                      onChange={(e) => setSelectedDoctorId(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 cursor-pointer"
                      style={{ fontFamily: "Outfit, sans-serif" }}
                    >
                      <option value="">Any Available Staff / Unassigned (Slot-wise)</option>
                      {serviceResponsibleDoctors.map((doc) => (
                        <option key={doc.id} value={doc.id}>
                          {doc.name} {(doc as any).specialty || (doc as any).role ? `— ${(doc as any).specialty || (doc as any).role}` : ""}
                        </option>
                      ))}
                    </select>
                    <p className="text-[10px] text-slate-400">
                      {selectedDoctorId
                        ? "Slots will show based on this practitioner's availability."
                        : "Slots will show based on open facility capacity across available staff."}
                    </p>
                  </div>

                  {/* Step 1 Continue CTA */}
                  <div className="pt-2">
                    <button
                      type="button"
                      onClick={() => setBookingStep(2)}
                      disabled={!selectedServiceId || !selectedLocation}
                      className="w-full py-3 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs transition-all shadow-sm shadow-blue-500/25 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                      style={{ fontFamily: "Outfit, sans-serif" }}
                    >
                      <span>Continue to Availability</span>
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </>
              ) : (
                <>
                  {/* Doctor / Service Profile Bar (Matches reference design) */}
                  <div className="flex items-center justify-between gap-3 p-3.5 bg-slate-50/80 rounded-2xl border border-slate-200/80">
                    <div className="flex items-center gap-3 min-w-0">
                      {selectedDoctorObj ? (
                        (selectedDoctorObj as any).avatar ? (
                          <img
                            src={(selectedDoctorObj as any).avatar}
                            alt={selectedDoctorObj.name}
                            className="w-11 h-11 rounded-full object-cover border border-slate-200 shadow-2xs shrink-0"
                          />
                        ) : (
                          <div className="w-11 h-11 rounded-full bg-blue-100 text-blue-700 font-bold text-sm flex items-center justify-center border border-blue-200 shrink-0">
                            {selectedDoctorObj.name
                              .split(" ")
                              .map((n) => n[0])
                              .join("")
                              .slice(0, 2)
                              .toUpperCase()}
                          </div>
                        )
                      ) : (
                        <div className="w-11 h-11 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center border border-blue-200/80 shrink-0">
                          <Stethoscope className="w-5 h-5" />
                        </div>
                      )}

                      <div className="min-w-0">
                        <h4 className="text-sm font-bold text-slate-900 truncate" style={{ fontFamily: "Outfit, sans-serif" }}>
                          {selectedDoctorObj ? selectedDoctorObj.name : selectedServiceObj?.name || "Consultation"}
                        </h4>
                        <p className="text-[11px] text-slate-500 truncate font-medium">
                          {selectedDoctorObj
                            ? (selectedDoctorObj as any).specialty || (selectedDoctorObj as any).role || "Therapist / Practitioner"
                            : `${selectedLocation} • Any Available Practitioner`}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 rounded-full text-xs font-semibold text-slate-600 shadow-2xs shrink-0">
                      <Clock className="w-3.5 h-3.5 text-blue-600" />
                      <span className="hidden sm:inline">{userTimezoneLabel}</span>
                      <span className="sm:hidden">{userTimezoneLabel.split(" ")[0]}</span>
                    </div>
                  </div>

                  {/* 1. What days work best for you? (Week carousel matching reference) */}
                  <div className="space-y-2.5 pt-1">
                    <h3 className="text-base font-bold text-slate-900" style={{ fontFamily: "Outfit, sans-serif" }}>
                      What days work best for you?
                    </h3>

                    <div className="flex items-center justify-between gap-1">
                      <button
                        type="button"
                        disabled={weekOffset === 0}
                        onClick={() => setWeekOffset((prev) => Math.max(0, prev - 1))}
                        className="p-1.5 sm:p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors cursor-pointer shrink-0"
                        title="Previous week"
                      >
                        <ChevronLeft className="w-5 h-5" />
                      </button>

                      <div className="grid grid-cols-7 gap-1 flex-1">
                        {weekDays.map((day) => {
                          const isSelected = date === day.fullDateStr;
                          return (
                            <button
                              key={day.fullDateStr}
                              type="button"
                              disabled={day.isPast}
                              onClick={() => setDate(day.fullDateStr)}
                              className={`py-2 px-1 rounded-2xl flex flex-col items-center justify-center transition-all cursor-pointer ${
                                isSelected
                                  ? "bg-[#009beb] text-white shadow-md shadow-sky-500/25 scale-[1.03]"
                                  : day.isPast
                                  ? "text-slate-300 opacity-40 cursor-not-allowed"
                                  : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                              }`}
                            >
                              <span className={`text-[11px] font-medium leading-none ${isSelected ? "text-sky-100" : "text-slate-400"}`}>
                                {day.dayOfWeek}
                              </span>
                              <span
                                className={`text-base sm:text-lg font-bold my-1 leading-none ${isSelected ? "text-white" : "text-slate-800"}`}
                                style={{ fontFamily: "Outfit, sans-serif" }}
                              >
                                {day.dayNum}
                              </span>
                              <span className={`text-[10px] font-medium leading-none ${isSelected ? "text-sky-100" : "text-slate-400"}`}>
                                {day.monthStr}
                              </span>
                            </button>
                          );
                        })}
                      </div>

                      <button
                        type="button"
                        onClick={() => setWeekOffset((prev) => prev + 1)}
                        className="p-1.5 sm:p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer shrink-0"
                        title="Next week"
                      >
                        <ChevronRight className="w-5 h-5" />
                      </button>
                    </div>
                  </div>

                  {/* 2. What time works? (3-column grid without counts, only available slots shown) */}
                  <div className="space-y-2.5 pt-2">
                    <div className="flex items-center justify-between">
                      <h3 className="text-base font-bold text-slate-900" style={{ fontFamily: "Outfit, sans-serif" }}>
                        What time works?
                      </h3>
                      <span className="text-[11px] text-slate-400 font-medium">
                        Duration: {selectedServiceObj?.slotDuration || selectedServiceObj?.duration || 30} mins
                      </span>
                    </div>

                    {slotNotice ? (
                      <div className="py-3 px-3.5 bg-amber-50 border border-amber-200 rounded-2xl text-xs text-amber-800 flex items-center gap-2">
                        <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                        <span>{slotNotice}</span>
                      </div>
                    ) : availableSlotsForPatient.length === 0 ? (
                      <div className="py-8 px-4 bg-slate-50 border border-dashed border-slate-200 rounded-2xl text-center space-y-1">
                        <p className="text-xs font-bold text-slate-700" style={{ fontFamily: "Outfit, sans-serif" }}>
                          No open slots on this date
                        </p>
                        <p className="text-[11px] text-slate-500">
                          Please select another day from the calendar above to view available appointments.
                        </p>
                      </div>
                    ) : (
                      <div className="grid grid-cols-3 gap-2.5 max-h-52 overflow-y-auto pr-1">
                        {availableSlotsForPatient.map((slot) => {
                          const isSelected = selectedTime === slot.label12;
                          return (
                            <button
                              key={`${slot.hour}:${slot.minute}`}
                              type="button"
                              onClick={() => setSelectedTime(slot.label12)}
                              className={`py-3 px-2 rounded-2xl text-xs transition-all text-center flex items-center justify-center cursor-pointer border ${
                                isSelected
                                  ? "bg-[#009beb] text-white font-bold shadow-md shadow-sky-500/25 border-[#009beb] scale-[1.02]"
                                  : "bg-slate-50/90 hover:bg-slate-100 hover:border-slate-300 text-slate-700 border-slate-200/80 font-semibold"
                              }`}
                              style={{ fontFamily: "Outfit, sans-serif" }}
                            >
                              <span>{slot.label12}</span>
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {/* 3. Room Direction Guide (if allocated) */}
                  {allocatedRoom && (
                    <div className="p-3 bg-blue-50/60 border border-blue-100 rounded-2xl flex items-center justify-between text-xs text-blue-900">
                      <div className="flex items-center gap-2 truncate">
                        <Building2 className="w-4 h-4 text-blue-600 shrink-0" />
                        <span className="truncate">
                          Assigned: <strong>Room {allocatedRoom.roomNumber} ({allocatedRoom.name})</strong>
                        </span>
                      </div>
                      <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200/60 shrink-0">
                        Auto-assigned
                      </span>
                    </div>
                  )}

                  {/* Step 2 Submit CTA */}
                  <div className="pt-2">
                    <button
                      type="submit"
                      disabled={isSubmitting || availableSlotsForPatient.length === 0}
                      className="w-full py-3 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs transition-all shadow-sm shadow-blue-500/25 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                      style={{ fontFamily: "Outfit, sans-serif" }}
                    >
                      <Check className="w-4 h-4" />
                      <span>{isSubmitting ? "Confirming..." : `Confirm Booking • ${selectedTime}`}</span>
                    </button>
                  </div>
                </>
              )}
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
