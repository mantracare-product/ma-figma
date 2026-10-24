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
  FileText,
  ChevronRight,
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
    return list.filter((s) => s.isActive !== false);
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
  const [bookingType, setBookingType] = useState<"service" | "specialist">("service");
  const [selectedServiceId, setSelectedServiceId] = useState<string>(() => String(services[0]?.id || "1"));
  const [selectedLocation, setSelectedLocation] = useState<string>(() => fullOrgLocations[0]?.name || "California");
  const [selectedDoctorId, setSelectedDoctorId] = useState<string>(() => String(team[0]?.id || "1"));
  const [date, setDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [selectedTime, setSelectedTime] = useState("09:00 AM");
  const [notes, setNotes] = useState("Follow-up clinical consultation");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const selectedServiceObj = useMemo(() => {
    return services.find((s) => String(s.id) === String(selectedServiceId)) || services[0];
  }, [services, selectedServiceId]);

  const selectedDoctorObj = useMemo(() => {
    return team.find((d) => String(d.id) === String(selectedDoctorId)) || team[0];
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

  // Sync doctor when service or location changes in "specialist" / responsible mode
  useEffect(() => {
    if (bookingType === "specialist" && serviceResponsibleDoctors.length > 0) {
      const isCurrentValid = serviceResponsibleDoctors.some((d) => String(d.id) === String(selectedDoctorId));
      if (!isCurrentValid) {
        setSelectedDoctorId(String(serviceResponsibleDoctors[0].id));
      }
    }
  }, [bookingType, serviceResponsibleDoctors, selectedDoctorId]);

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

    const duration = selectedServiceObj?.duration || 30;
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

  // Auto-select first available slot when slots change
  useEffect(() => {
    if (activeSlots.length > 0) {
      const matchesCurrent = activeSlots.some((s) => s.label12 === selectedTime && !s.disabled);
      if (!matchesCurrent) {
        const firstAvail = activeSlots.find((s) => !s.disabled);
        if (firstAvail) {
          setSelectedTime(firstAvail.label12);
        }
      }
    }
  }, [activeSlots, selectedTime]);

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
      if (bookingType === "specialist") {
        assignedEmpId = Number(selectedDoctorObj?.id) || 1;
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
          duration: selectedServiceObj?.duration || 30,
          title,
          notes,
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
          onClick={() => setShowBookingModal(true)}
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
            <div className="p-5 sm:p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
              <div className="space-y-0.5">
                <h3 className="text-lg font-bold text-slate-900" style={{ fontFamily: "Outfit, sans-serif" }}>Book Appointment</h3>
                <p className="text-xs text-slate-500 font-medium">
                  {bookingType === "service"
                    ? "Select consultation service, facility location, and available time slot"
                    : "Select your specialist, service, and available time slot"}
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

            {/* Modal Form */}
            <form onSubmit={handleCreateBooking} className="p-5 sm:p-6 overflow-y-auto space-y-4">
              {/* Segmented Booking Type Tab Switcher */}
              <div className="bg-slate-100 p-1 rounded-2xl border border-slate-200/80 flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setBookingType("service")}
                  className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                    bookingType === "service"
                      ? "bg-white text-slate-900 shadow-xs border border-slate-200/60"
                      : "text-slate-500 hover:text-slate-800"
                  }`}
                  style={{ fontFamily: "Outfit, sans-serif" }}
                >
                  <Layers className="w-3.5 h-3.5 text-blue-600" />
                  <span>Service</span>
                </button>
                <button
                  type="button"
                  onClick={() => setBookingType("specialist")}
                  className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                    bookingType === "specialist"
                      ? "bg-white text-slate-900 shadow-xs border border-slate-200/60"
                      : "text-slate-500 hover:text-slate-800"
                  }`}
                  style={{ fontFamily: "Outfit, sans-serif" }}
                >
                  <UserCheck className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Responsible</span>
                </button>
              </div>

              {/* 1. Service Selection */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5" style={{ fontFamily: "Outfit, sans-serif" }}>
                  <Layers className="w-3.5 h-3.5 text-blue-600" />
                  <span>Service</span>
                </label>
                <select
                  value={selectedServiceId}
                  onChange={(e) => setSelectedServiceId(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 cursor-pointer"
                  style={{ fontFamily: "Outfit, sans-serif" }}
                >
                  {services.map((srv) => (
                    <option key={srv.id} value={srv.id}>
                      {srv.name} ({srv.duration || 30} mins) — ${srv.price || 75}
                    </option>
                  ))}
                </select>
              </div>

              {/* 2. Facility Location (Follows Service) */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5" style={{ fontFamily: "Outfit, sans-serif" }}>
                  <MapPin className="w-3.5 h-3.5 text-blue-600" />
                  <span>Facility Location</span>
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

              {/* 3. Responsible Physician / Specialist (Follows Location in Responsible mode) */}
              {bookingType === "specialist" && (
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 flex items-center justify-between" style={{ fontFamily: "Outfit, sans-serif" }}>
                    <span className="flex items-center gap-1.5">
                      <UserCheck className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Responsible Physician / Specialist</span>
                    </span>
                    {serviceResponsibleDoctors.length > 0 && (
                      <span className="text-[10px] text-slate-400 font-normal">
                        ({serviceResponsibleDoctors.length} assigned)
                      </span>
                    )}
                  </label>
                  <select
                    value={selectedDoctorId}
                    onChange={(e) => setSelectedDoctorId(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 cursor-pointer"
                    style={{ fontFamily: "Outfit, sans-serif" }}
                  >
                    {serviceResponsibleDoctors.map((doc) => (
                      <option key={doc.id} value={doc.id}>
                        {doc.name} {(doc as any).specialty || (doc as any).role ? `— ${(doc as any).specialty || (doc as any).role}` : ""}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* 4. Allocated Room Display */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5" style={{ fontFamily: "Outfit, sans-serif" }}>
                    <Building2 className="w-3.5 h-3.5 text-blue-600" />
                    <span>Allocated Room</span>
                  </label>
                  {allocatedRoom && (
                    <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200/60">
                      Auto-assigned
                    </span>
                  )}
                </div>
                <div className="w-full px-3.5 py-2.5 bg-blue-50/70 border border-blue-200/90 rounded-xl text-xs text-blue-900 space-y-1">
                  <div className="flex items-center gap-2 font-bold truncate">
                    <MapPin className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                    <span className="truncate">
                      {allocatedRoom
                        ? `Room ${allocatedRoom.roomNumber} (${allocatedRoom.name})`
                        : "General Station"}
                    </span>
                  </div>
                  {allocatedRoom?.direction && (
                    <p className="text-[11px] text-blue-700 font-medium leading-tight flex items-center gap-1.5 pt-0.5" title={allocatedRoom.direction}>
                      <Navigation className="w-3 h-3 shrink-0 text-blue-500" />
                      <span><strong>Directions:</strong> {allocatedRoom.direction}</span>
                    </p>
                  )}
                </div>
              </div>

              {/* Date & Interactive Slots Grid (Matches MA ScheduleAppointmentDrawer) */}
              <div className="space-y-3 pt-1">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5" style={{ fontFamily: "Outfit, sans-serif" }}>
                    <Calendar className="w-3.5 h-3.5 text-blue-600" />
                    <span>Appointment Date</span>
                  </label>
                  <input
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                    style={{ fontFamily: "Outfit, sans-serif" }}
                  />
                </div>

                {/* Available Slots */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5" style={{ fontFamily: "Outfit, sans-serif" }}>
                      <Clock className="w-3.5 h-3.5 text-blue-600" />
                      <span>Available Slots</span>
                    </label>
                    <span className="text-[11px] text-slate-400 font-medium">
                      Duration: {selectedServiceObj?.duration || 30} mins
                    </span>
                  </div>

                  {!date ? (
                    <div className="py-3 px-3.5 bg-slate-50 border border-dashed border-slate-200 rounded-xl text-xs text-slate-400" style={{ fontFamily: "DM Sans, sans-serif" }}>
                      Select an appointment date above to view available time slots.
                    </div>
                  ) : slotNotice ? (
                    <div className="py-3 px-3.5 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800 flex items-center gap-2" style={{ fontFamily: "DM Sans, sans-serif" }}>
                      <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                      <span>{slotNotice}</span>
                    </div>
                  ) : activeSlots.length === 0 ? (
                    <div className="py-3 px-3.5 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800 flex items-center gap-2" style={{ fontFamily: "DM Sans, sans-serif" }}>
                      <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                      <span>
                        {bookingType === "service"
                          ? "No open slots found for this service at the selected location on this date."
                          : `No open slots found for ${selectedDoctorObj?.name || "the specialist"} on this date.`}
                      </span>
                    </div>
                  ) : (
                    <div className="space-y-2.5">
                      <div className="grid grid-cols-3 sm:grid-cols-4 gap-1.5 max-h-48 overflow-y-auto pr-1">
                        {activeSlots.map((slot) => {
                          const isSelected = selectedTime === slot.label12;
                          return (
                            <button
                              key={`${slot.hour}:${slot.minute}`}
                              type="button"
                              disabled={slot.disabled}
                              onClick={() => setSelectedTime(slot.label12)}
                              className={`py-2 px-2 rounded-xl text-xs transition-all text-center flex flex-col items-center justify-center cursor-pointer ${
                                isSelected
                                  ? "bg-blue-600 text-white font-bold shadow-xs shadow-blue-500/25"
                                  : slot.disabled
                                  ? "bg-slate-100 text-slate-400 border border-slate-200/60 line-through cursor-not-allowed opacity-60"
                                  : "bg-slate-50/80 hover:bg-white text-slate-700 border border-slate-200 hover:border-slate-300 font-semibold"
                              }`}
                              style={{ fontFamily: "DM Sans, sans-serif" }}
                              title={
                                slot.disabled
                                  ? slot.isServiceSlot
                                    ? "Fully booked for this time slot"
                                    : "Slot already booked"
                                  : slot.isServiceSlot
                                  ? `${slot.label12} (${slot.remaining} seats left)`
                                  : slot.label12
                              }
                            >
                              <span>{slot.label12}</span>
                              {slot.isServiceSlot && (
                                <span
                                  className={`text-[9px] font-medium mt-0.5 ${
                                    slot.disabled
                                      ? "text-slate-400"
                                      : isSelected
                                      ? "text-blue-100"
                                      : "text-emerald-600"
                                  }`}
                                >
                                  {slot.remaining} left
                                </span>
                              )}
                            </button>
                          );
                        })}
                      </div>

                      <div className="flex items-center justify-between px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-600">
                        <span className="flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5 text-blue-600" />
                          <span>
                            Selected Slot: <strong className="text-slate-900 font-bold">{selectedTime}</strong>
                          </span>
                        </span>
                        <span className="text-[11px] text-slate-500 font-medium">
                          {bookingType === "service" ? "Service Booking" : "Specialist Booking"}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Notes */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5" style={{ fontFamily: "Outfit, sans-serif" }}>
                  <FileText className="w-3.5 h-3.5 text-blue-600" />
                  <span>Reason / Notes</span>
                </label>
                <input
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="e.g. routine check-up, eye discomfort..."
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  style={{ fontFamily: "Outfit, sans-serif" }}
                />
              </div>

              {/* Submit CTA */}
              <div className="pt-2">
                <button
                  type="submit"
                  disabled={isSubmitting || activeSlots.length === 0}
                  className="w-full py-3 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs transition-all shadow-sm shadow-blue-500/25 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                  style={{ fontFamily: "Outfit, sans-serif" }}
                >
                  <Check className="w-4 h-4" />
                  <span>{isSubmitting ? "Confirming..." : "Confirm Booking"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
