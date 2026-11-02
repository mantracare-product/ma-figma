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
  ChevronDown,
  Sparkles,
  Users,
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
  const [openDropdown, setOpenDropdown] = useState<"service" | "physician" | "location" | null>(null);
  const [weekOffset, setWeekOffset] = useState(0);
  const [selectedServiceId, setSelectedServiceId] = useState<string>(() => String(services[0]?.id || ""));
  const [selectedLocation, setSelectedLocation] = useState<string>(() => fullOrgLocations[0]?.name || "California");
  const [selectedDoctorId, setSelectedDoctorId] = useState<string>(""); // "" = Any Available Clinician (combined slots)
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
    let docs = team;
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
          if (matched.length > 0) docs = matched;
        }
      } else if (srv.assignedEmployees && srv.assignedEmployees.length > 0) {
        const assignedIds = new Set(srv.assignedEmployees.map(String));
        const matched = team.filter((e) => assignedIds.has(String(e.id)));
        if (matched.length > 0) docs = matched;
      }
    }

    // Ensure demo clinicians (Akshita Sharma & Alice) are always available in the list
    const hasAkshita = docs.some((d) => d.name?.toLowerCase().includes("akshita"));
    const hasAlice = docs.some((d) => d.name?.toLowerCase().includes("alice"));
    const demoDocsToAdd = team.filter((d) =>
      (!hasAkshita && d.name?.toLowerCase().includes("akshita")) ||
      (!hasAlice && d.name?.toLowerCase().includes("alice"))
    );
    if (demoDocsToAdd.length > 0) {
      return [...docs, ...demoDocsToAdd];
    }
    return docs;
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

  // ── 4. Dynamic Slot Calculation & Unified Availability Engine ──
  // Baseline service capacity slots
  const serviceModeSlots = useMemo(() => {
    if (!selectedServiceObj || !selectedLocation || !date) return [];
    const loc = fullOrgLocations.find((l) => l.name.toLowerCase() === selectedLocation.toLowerCase());
    if (!loc) return [];
    try {
      const allAppts = appointmentService.getAppointments();
      return getServiceSlots(selectedServiceObj as any, loc, date, allAppts);
    } catch {
      return [];
    }
  }, [selectedServiceObj, selectedLocation, date, fullOrgLocations]);

  // Helper: compute available working slots for a single clinician on targetDate
  const computeDoctorSlotsForDate = (
    doc: any,
    srv: any,
    locName: string,
    targetDate: string
  ): { slots: Array<{ hour: number; minute: number; timeStr: string; label12: string }>; notice: string | null } => {
    if (!doc || !srv || !locName || !targetDate) return { slots: [], notice: null };

    // 1. Check doctor's common days off
    try {
      const daysOffSaved = localStorage.getItem(
        `mantra_member_common_days_off_${doc.id}_${activeOrganization.id}`
      );
      if (daysOffSaved) {
        const daysOff = JSON.parse(daysOffSaved);
        if (Array.isArray(daysOff)) {
          const match = daysOff.find((d: any) => d.date === targetDate);
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
    const [yr, mo, dy] = targetDate.split("-").map(Number);
    const dateObj = new Date(yr, (mo || 1) - 1, dy || 1);
    const dayNames = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
    const dayKey = dayNames[dateObj.getDay()];

    let startMin = 9 * 60; // 09:00 AM
    let endMin = 17 * 60;  // 05:00 PM
    let isDayEnabled = true;

    // Doctor Shift Differentiation for demo:
    // Akshita Sharma = Morning shift (09:00 AM – 01:00 PM)
    // Alice = Afternoon shift (01:30 PM – 05:30 PM)
    const docNameLower = (doc.name || "").toLowerCase();
    const docIdStr = String(doc.id);
    if (docNameLower.includes("akshita") || docIdStr === "2") {
      startMin = 9 * 60;
      endMin = 13 * 60;
    } else if (docNameLower.includes("alice") || docIdStr === "3") {
      startMin = 13 * 60 + 30;
      endMin = 17 * 60 + 30;
    }

    const targetLocObj = fullOrgLocations.find((l) => l.name.toLowerCase() === locName.toLowerCase());
    const locId = targetLocObj?.id || "loc-1";

    if (targetLocObj && !isServiceEnabledAtLocation(srv, targetLocObj)) {
      return {
        slots: [],
        notice: `${srv.name} is not offered at ${targetLocObj.name}.`,
      };
    }

    if (targetLocObj) {
      if (targetLocObj.daysOff && Array.isArray(targetLocObj.daysOff)) {
        const isLocDayOff = targetLocObj.daysOff.some((d: any) => d.date === targetDate);
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

    if (!isDayEnabled && (doc.name?.toLowerCase().includes("admin") || String(doc.id) === "1")) {
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
          apt.date === targetDate &&
          String(apt.employeeId) === String(doc.id) &&
          apt.status !== "cancelled" &&
          apt.time
        ) {
          const [ah, am] = apt.time.split(":").map(Number);
          bookedTimes.add(`${String(ah).padStart(2, "0")}:${String(am).padStart(2, "0")}`);
        }
      });
    } catch {}

    const duration = srv.slotDuration || srv.duration || 30;
    const slots: Array<{ hour: number; minute: number; timeStr: string; label12: string }> = [];

    for (let current = startMin; current + duration <= endMin; current += duration) {
      const h = Math.floor(current / 60);
      const m = current % 60;
      const timeStr = `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
      const p = h >= 12 ? "PM" : "AM";
      const h12 = h % 12 === 0 ? 12 : h % 12;
      const label12 = `${h12}:${String(m).padStart(2, "0")} ${p}`;
      const isBooked = bookedTimes.has(timeStr);

      if (!isBooked) {
        slots.push({
          hour: h,
          minute: m,
          timeStr,
          label12,
        });
      }
    }

    return { slots, notice: null };
  };

  // ── Unified Availability Engine ──
  const availabilityData = useMemo(() => {
    // 1. Specific doctor selected
    if (selectedDoctorId) {
      const doc = selectedDoctorObj;
      if (!doc) {
        return {
          slots: [],
          notice: "Doctor profile not found.",
          timeToAvailableDocs: new Map<string, any[]>(),
        };
      }
      const res = computeDoctorSlotsForDate(doc, selectedServiceObj, selectedLocation, date);
      const docMap = new Map<string, any[]>();
      res.slots.forEach((s) => docMap.set(s.label12, [doc]));
      return {
        slots: res.slots,
        notice: res.notice,
        timeToAvailableDocs: docMap,
      };
    }

    // 2. "Any Available Clinician" mode: Combine slots across all eligible doctors
    const docs = serviceResponsibleDoctors.length > 0 ? serviceResponsibleDoctors : team;
    const timeToAvailableDocs = new Map<string, any[]>();
    const slotMap = new Map<string, { hour: number; minute: number; timeStr: string; label12: string }>();

    docs.forEach((doc) => {
      const res = computeDoctorSlotsForDate(doc, selectedServiceObj, selectedLocation, date);
      res.slots.forEach((s) => {
        if (!timeToAvailableDocs.has(s.label12)) {
          timeToAvailableDocs.set(s.label12, []);
          slotMap.set(s.label12, s);
        }
        timeToAvailableDocs.get(s.label12)!.push(doc);
      });
    });

    let combinedSlots: Array<{ hour: number; minute: number; timeStr: string; label12: string }> = [];
    if (slotMap.size > 0) {
      combinedSlots = Array.from(slotMap.values()).sort(
        (a, b) => a.hour * 60 + a.minute - (b.hour * 60 + b.minute)
      );
    } else if (serviceModeSlots.length > 0) {
      combinedSlots = serviceModeSlots
        .filter((s) => !s.isFull)
        .map((s) => ({
          hour: s.hour,
          minute: s.minute,
          timeStr: s.timeStr,
          label12: s.label12,
        }));
    }

    return {
      slots: combinedSlots,
      notice: null,
      timeToAvailableDocs,
    };
  }, [
    selectedDoctorId,
    selectedDoctorObj,
    selectedServiceObj,
    selectedLocation,
    date,
    serviceResponsibleDoctors,
    team,
    serviceModeSlots,
    fullOrgLocations,
    activeOrganization.id,
  ]);

  const availableSlotsForPatient = availabilityData.slots;
  const slotNotice = availabilityData.notice;

  // Auto-select first available slot when slots change
  useEffect(() => {
    if (availableSlotsForPatient.length > 0) {
      const matchesCurrent = availableSlotsForPatient.some((s) => s.label12 === selectedTime);
      if (!matchesCurrent) {
        setSelectedTime(availableSlotsForPatient[0].label12);
      }
    }
  }, [availableSlotsForPatient, selectedTime]);

  const handleCreateBooking = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeClient) return;

    setIsSubmitting(true);
    try {
      let assignedEmpId: number | undefined = undefined;
      let assignedEmpName: string | undefined = undefined;

      if (selectedDoctorId) {
        assignedEmpId = Number(selectedDoctorId) || Number(selectedDoctorObj?.id) || undefined;
        assignedEmpName = selectedDoctorObj?.name;
      } else {
        const availableDocs = availabilityData.timeToAvailableDocs.get(selectedTime) || serviceResponsibleDoctors;
        const autoDoc = availableDocs && availableDocs.length > 0 ? availableDocs[0] : team[0];
        if (autoDoc) {
          assignedEmpId = Number(autoDoc.id);
          assignedEmpName = autoDoc.name;
        }
      }

      const title = selectedDoctorId
        ? `${selectedServiceObj?.name || "Consultation"} with ${selectedDoctorObj?.name || "Doctor"}`
        : `${selectedServiceObj?.name || "Consultation"} Consultation`;

      const roomToAssign = allocatedRoom || findRoomForAppointment({
        serviceId: selectedServiceId,
        location: selectedLocation,
        employeeId: assignedEmpId,
        employeeName: assignedEmpName,
      });

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
          roomNumber: roomToAssign?.roomNumber,
          roomStationId: roomToAssign?.id,
          roomName: roomToAssign?.name,
          bookingType: selectedDoctorId ? "specialist" : "service",
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
    <div className="max-w-3xl mx-auto space-y-6 pb-12 animate-in fade-in duration-200">
      {/* ── Page Header (Matches media_1792996748102.png) ── */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-base font-semibold text-slate-900">Visits</h1>
        </div>

        <button
          type="button"
          onClick={() => {
            setBookingStep(1);
            setWeekOffset(0);
            setShowBookingModal(true);
          }}
          className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-full bg-[#1e293b] hover:bg-[#0f172a] text-white font-semibold text-xs shadow-md shadow-slate-900/10 transition-all cursor-pointer active:scale-95"
        >
          <span>+ Book appointment</span>
        </button>
      </div>

      {/* ── Tab Switcher: Upcoming vs Past (Matches media_1792996748102.png) ── */}
      <div className="flex items-center gap-6 border-b border-slate-100">
        <button
          type="button"
          onClick={() => setActiveTab("upcoming")}
          className={`pb-2.5 text-xs font-medium transition-colors cursor-pointer border-b-2 -mb-px ${
            activeTab === "upcoming"
              ? "border-blue-600 text-blue-600 font-semibold"
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          Upcoming
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("past")}
          className={`pb-2.5 text-xs font-medium transition-colors cursor-pointer border-b-2 -mb-px ${
            activeTab === "past"
              ? "border-blue-600 text-blue-600 font-semibold"
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          Past
        </button>
      </div>

      {/* ── Appointment List / Empty State (Matches media_1792996748102.png) ── */}
      {displayAppts.length === 0 ? (
        <div className="py-20 px-8 text-center bg-white rounded-3xl border border-slate-300/80 flex flex-col items-center justify-center space-y-2 select-none">
          <Calendar className="w-12 h-12 text-slate-300 stroke-[1.25] mb-2" />
          <h3 className="text-base font-semibold text-slate-900">
            No appointments
          </h3>
          <p className="text-xs text-slate-400 font-normal">
            You don't have any upcoming visits at the moment.
          </p>
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

      {/* ── Book Appointment Modal (2-Step Flow) ── */}
      {showBookingModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-2xs animate-in fade-in duration-150"
          onClick={() => {
            setShowBookingModal(false);
            setOpenDropdown(null);
            setBookingStep(1);
          }}
        >
          <div
            className="relative w-full max-w-[460px] bg-white rounded-3xl shadow-2xl border border-slate-100 p-7 space-y-5 max-h-[92vh] overflow-y-auto animate-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Invisible overlay when dropdown is open to close on outside click */}
            {openDropdown && (
              <div
                className="fixed inset-0 z-30 bg-transparent"
                onClick={() => setOpenDropdown(null)}
              />
            )}

            {bookingStep === 1 ? (
              /* ── STEP 1: Service & Physician Selection ── */
              <div className="space-y-5">
                {/* Modal Header */}
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <h3 className="text-xl font-bold text-slate-900 tracking-tight" style={{ fontFamily: "Outfit, sans-serif" }}>
                      Book Appointment
                    </h3>
                    <p className="text-[13px] text-slate-500 font-normal">
                      Select consultation service and physician
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setShowBookingModal(false);
                      setOpenDropdown(null);
                      setBookingStep(1);
                    }}
                    className="p-1 -mr-1 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-50 transition-colors cursor-pointer"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="space-y-4 pt-1">
                  {/* 1. Service Dropdown */}
                  <div className="space-y-1.5 relative">
                    <label className="text-[13px] font-semibold text-slate-700 block">
                      Service
                    </label>
                    <button
                      type="button"
                      onClick={() => setOpenDropdown((prev) => (prev === "service" ? null : "service"))}
                      className={`w-full h-12 px-4 bg-white border rounded-2xl text-sm font-medium text-slate-800 flex items-center justify-between transition-all cursor-pointer ${
                        openDropdown === "service"
                          ? "border-blue-500 ring-2 ring-blue-500/10 shadow-xs"
                          : "border-slate-200 hover:border-slate-300 shadow-2xs"
                      }`}
                    >
                      <span className="truncate">
                        {selectedServiceObj
                          ? `${selectedServiceObj.name} — $${selectedServiceObj.price || 75}`
                          : "Select a service"}
                      </span>
                      <ChevronDown
                        className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${
                          openDropdown === "service" ? "rotate-180" : ""
                        }`}
                      />
                    </button>

                    {openDropdown === "service" && (
                      <div className="absolute top-full left-0 right-0 mt-2 z-40 bg-white border border-slate-100 rounded-2xl shadow-[0_12px_36px_rgba(0,0,0,0.1)] p-2 space-y-1 animate-in fade-in zoom-in-95 duration-100 max-h-60 overflow-y-auto">
                        {services.map((srv) => {
                          const isSelected = String(srv.id) === String(selectedServiceId);
                          return (
                            <button
                              key={srv.id}
                              type="button"
                              onClick={() => {
                                setSelectedServiceId(String(srv.id));
                                setOpenDropdown(null);
                              }}
                              className={`w-full px-3.5 py-2.5 rounded-xl text-left text-sm transition-all flex items-center cursor-pointer ${
                                isSelected
                                  ? "bg-[#f0f6ff] text-slate-900 font-semibold"
                                  : "text-slate-700 hover:bg-slate-50 font-normal"
                              }`}
                            >
                              {isSelected ? (
                                <Check className="w-4 h-4 text-blue-600 stroke-[2.5] shrink-0 mr-2.5" />
                              ) : (
                                <span className="w-4 h-4 shrink-0 mr-2.5 invisible" />
                              )}
                              <span className="truncate">
                                {srv.name} — ${srv.price || 75}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {/* 2. Attending Physician Dropdown (Matches Reference 1:1) */}
                  <div className="space-y-1.5 relative">
                    <label className="text-[13px] font-semibold text-slate-700 block">
                      Attending Physician
                    </label>
                    <button
                      type="button"
                      onClick={() => setOpenDropdown((prev) => (prev === "physician" ? null : "physician"))}
                      className={`w-full h-12 px-4 bg-white border rounded-2xl text-sm font-medium text-slate-800 flex items-center justify-between transition-all cursor-pointer ${
                        openDropdown === "physician"
                          ? "border-blue-500 ring-2 ring-blue-500/10 shadow-xs"
                          : "border-slate-200 hover:border-slate-300 shadow-2xs"
                      }`}
                    >
                      <span className="truncate">
                        {selectedDoctorObj ? selectedDoctorObj.name : "Any Available Clinician"}
                      </span>
                      <ChevronDown
                        className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${
                          openDropdown === "physician" ? "rotate-180" : ""
                        }`}
                      />
                    </button>

                    {openDropdown === "physician" && (
                      <div className="absolute top-full left-0 right-0 mt-2 z-40 bg-white border border-slate-100 rounded-2xl shadow-[0_12px_36px_rgba(0,0,0,0.1)] p-2 space-y-1 animate-in fade-in zoom-in-95 duration-100 max-h-60 overflow-y-auto">
                        {/* Any Available Clinician Option */}
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedDoctorId("");
                            setOpenDropdown(null);
                          }}
                          className={`w-full px-3.5 py-2.5 rounded-xl text-left text-sm transition-all flex items-center cursor-pointer ${
                            !selectedDoctorId
                              ? "bg-[#f0f6ff] text-slate-900 font-semibold"
                              : "text-slate-700 hover:bg-slate-50 font-normal"
                          }`}
                        >
                          {!selectedDoctorId ? (
                            <Check className="w-4 h-4 text-blue-600 stroke-[2.5] shrink-0 mr-2.5" />
                          ) : (
                            <span className="w-4 h-4 shrink-0 mr-2.5 invisible" />
                          )}
                          <span className="truncate">Any Available Clinician</span>
                        </button>

                        {/* Doctors List */}
                        {serviceResponsibleDoctors.map((doc) => {
                          const isSelected = selectedDoctorId === String(doc.id);
                          return (
                            <button
                              key={doc.id}
                              type="button"
                              onClick={() => {
                                setSelectedDoctorId(String(doc.id));
                                setOpenDropdown(null);
                              }}
                              className={`w-full px-3.5 py-2.5 rounded-xl text-left text-sm transition-all flex items-center cursor-pointer ${
                                isSelected
                                  ? "bg-[#f0f6ff] text-slate-900 font-semibold"
                                  : "text-slate-700 hover:bg-slate-50 font-normal"
                              }`}
                            >
                              {isSelected ? (
                                <Check className="w-4 h-4 text-blue-600 stroke-[2.5] shrink-0 mr-2.5" />
                              ) : (
                                <span className="w-4 h-4 shrink-0 mr-2.5 invisible" />
                              )}
                              <span className="truncate">{doc.name}</span>
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {/* 3. Location Dropdown (if multiple locations exist) */}
                  {availableLocations.length > 1 && (
                    <div className="space-y-1.5 relative">
                      <label className="text-[13px] font-semibold text-slate-700 block">
                        Facility Location
                      </label>
                      <button
                        type="button"
                        onClick={() => setOpenDropdown((prev) => (prev === "location" ? null : "location"))}
                        className={`w-full h-12 px-4 bg-white border rounded-2xl text-sm font-medium text-slate-800 flex items-center justify-between transition-all cursor-pointer ${
                          openDropdown === "location"
                            ? "border-blue-500 ring-2 ring-blue-500/10 shadow-xs"
                            : "border-slate-200 hover:border-slate-300 shadow-2xs"
                        }`}
                      >
                        <span className="truncate">{selectedLocation}</span>
                        <ChevronDown
                          className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${
                            openDropdown === "location" ? "rotate-180" : ""
                          }`}
                        />
                      </button>

                      {openDropdown === "location" && (
                        <div className="absolute top-full left-0 right-0 mt-2 z-40 bg-white border border-slate-100 rounded-2xl shadow-[0_12px_36px_rgba(0,0,0,0.1)] p-2 space-y-1 animate-in fade-in zoom-in-95 duration-100 max-h-60 overflow-y-auto">
                          {availableLocations.map((loc) => {
                            const isSelected = loc.name.toLowerCase() === selectedLocation.toLowerCase();
                            return (
                              <button
                                key={loc.id || loc.name}
                                type="button"
                                onClick={() => {
                                  setSelectedLocation(loc.name);
                                  setOpenDropdown(null);
                                }}
                                className={`w-full px-3.5 py-2.5 rounded-xl text-left text-sm transition-all flex items-center cursor-pointer ${
                                  isSelected
                                    ? "bg-[#f0f6ff] text-slate-900 font-semibold"
                                    : "text-slate-700 hover:bg-slate-50 font-normal"
                                }`}
                              >
                                {isSelected ? (
                                  <Check className="w-4 h-4 text-blue-600 stroke-[2.5] shrink-0 mr-2.5" />
                                ) : (
                                  <span className="w-4 h-4 shrink-0 mr-2.5 invisible" />
                                )}
                                <span className="truncate">{loc.name}</span>
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Step 1 Action Button: Continue to Step 2 */}
                  <div className="pt-3">
                    <button
                      type="button"
                      onClick={() => {
                        setOpenDropdown(null);
                        setBookingStep(2);
                      }}
                      className="w-full py-3.5 px-6 rounded-full bg-[#1e293b] hover:bg-[#0f172a] text-white font-bold text-sm shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-[0.99]"
                    >
                      <span>Continue to Date & Time</span>
                      <ChevronRight className="w-4 h-4 stroke-[2.5]" />
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              /* ── STEP 2: Date & Available Slots Selection ── */
              <form onSubmit={handleCreateBooking} className="space-y-4">
                {/* Step 2 Header with Back Button */}
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setBookingStep(1)}
                      className="p-1.5 -ml-1.5 rounded-xl text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors cursor-pointer"
                      title="Back to Service & Physician"
                    >
                      <ChevronLeft className="w-5 h-5 stroke-[2.5]" />
                    </button>
                    <div className="space-y-0.5">
                      <h3 className="text-xl font-bold text-slate-900 tracking-tight" style={{ fontFamily: "Outfit, sans-serif" }}>
                        Select Date & Time
                      </h3>
                      <p className="text-[13px] text-slate-500 font-normal">
                        Pick consultation slot & confirm appointment
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setShowBookingModal(false);
                      setOpenDropdown(null);
                      setBookingStep(1);
                    }}
                    className="p-1 -mr-1 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-50 transition-colors cursor-pointer"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {/* Selected Service & Physician Summary Badge */}
                <div className="flex items-center justify-between px-3.5 py-2.5 rounded-2xl bg-slate-50 border border-slate-100 text-xs">
                  <div className="flex items-center gap-2 truncate">
                    <span className="font-semibold text-slate-800 truncate">{selectedServiceObj?.name}</span>
                    <span className="text-slate-300">•</span>
                    <span className="text-blue-600 font-medium truncate">
                      {selectedDoctorObj ? selectedDoctorObj.name : "Any Available Clinician"}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setBookingStep(1)}
                    className="text-blue-600 hover:text-blue-700 font-semibold cursor-pointer shrink-0 ml-2 text-xs hover:underline"
                  >
                    Change
                  </button>
                </div>

                {/* Date Selection */}
                <div className="space-y-1.5">
                  <label className="text-[13px] font-semibold text-slate-700 block">
                    Select Date
                  </label>
                  <div className="flex items-center justify-between gap-1">
                    <button
                      type="button"
                      disabled={weekOffset === 0}
                      onClick={() => setWeekOffset((prev) => Math.max(0, prev - 1))}
                      className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors cursor-pointer shrink-0"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>

                    <div className="grid grid-cols-7 gap-1.5 flex-1">
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
                                ? "bg-[#1e293b] text-white shadow-sm scale-[1.02]"
                                : day.isPast
                                ? "text-slate-300 opacity-40 cursor-not-allowed"
                                : "text-slate-600 hover:bg-slate-100 hover:text-slate-900 border border-transparent"
                            }`}
                          >
                            <span className={`text-[10px] font-medium leading-none ${isSelected ? "text-slate-300" : "text-slate-400"}`}>
                              {day.dayOfWeek}
                            </span>
                            <span
                              className={`text-sm font-bold my-1 leading-none ${isSelected ? "text-white" : "text-slate-800"}`}
                              style={{ fontFamily: "Outfit, sans-serif" }}
                            >
                              {day.dayNum}
                            </span>
                            <span className={`text-[9px] font-medium leading-none ${isSelected ? "text-slate-300" : "text-slate-400"}`}>
                              {day.monthStr}
                            </span>
                          </button>
                        );
                      })}
                    </div>

                    <button
                      type="button"
                      onClick={() => setWeekOffset((prev) => prev + 1)}
                      className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer shrink-0"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Available Time Slots with Shift Differentiation Badge */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-[13px] font-semibold text-slate-700">
                      Available Time
                    </label>
                    {selectedDoctorObj ? (
                      <span className="text-[11px] font-medium text-slate-500">
                        {(selectedDoctorObj.name?.toLowerCase().includes("akshita") || String(selectedDoctorObj.id) === "2")
                          ? "Morning Shift (9:00 AM – 1:00 PM)"
                          : (selectedDoctorObj.name?.toLowerCase().includes("alice") || String(selectedDoctorObj.id) === "3")
                          ? "Afternoon Shift (1:30 PM – 5:30 PM)"
                          : "Scheduled Hours"}
                      </span>
                    ) : (
                      <span className="text-[11px] font-medium text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200/60">
                        Combined Slots (All Clinicians)
                      </span>
                    )}
                  </div>

                  {slotNotice || availableSlotsForPatient.length === 0 ? (
                    <div className="py-4 px-4 bg-slate-50 border border-slate-200 rounded-2xl text-center space-y-1">
                      <p className="text-xs font-semibold text-slate-700">
                        {selectedDoctorObj ? `No open slots for ${selectedDoctorObj.name} on this date` : "No open slots on this date"}
                      </p>
                      <p className="text-[11px] text-slate-500">
                        {slotNotice || "Please select another date or switch to Any Available Clinician."}
                      </p>
                      {selectedDoctorId && (
                        <button
                          type="button"
                          onClick={() => setSelectedDoctorId("")}
                          className="text-xs font-bold text-blue-600 hover:underline cursor-pointer pt-1 inline-block"
                        >
                          Switch to Any Available Clinician
                        </button>
                      )}
                    </div>
                  ) : (
                    <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 max-h-36 overflow-y-auto pr-0.5">
                      {availableSlotsForPatient.map((slot) => {
                        const isSelected = selectedTime === slot.label12;
                        return (
                          <button
                            key={`${slot.hour}:${slot.minute}`}
                            type="button"
                            onClick={() => setSelectedTime(slot.label12)}
                            className={`py-2 px-2 rounded-xl text-xs font-medium transition-all text-center flex items-center justify-center cursor-pointer border ${
                              isSelected
                                ? "bg-[#1e293b] text-white font-bold border-[#1e293b] shadow-xs"
                                : "bg-white hover:bg-slate-50 text-slate-700 border-slate-200 hover:border-slate-300"
                            }`}
                          >
                            <span>{slot.label12}</span>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Step 2 CTA: Confirm Booking (Matches Reference Exactly) */}
                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={isSubmitting || availableSlotsForPatient.length === 0}
                    className="w-full py-3.5 px-6 rounded-full bg-[#1e293b] hover:bg-[#0f172a] text-white font-bold text-sm shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed active:scale-[0.99]"
                  >
                    <Check className="w-4 h-4 stroke-[2.5]" />
                    <span>{isSubmitting ? "Confirming..." : "Confirm Booking"}</span>
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
