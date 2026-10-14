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
} from "lucide-react";
import { Client, getStoredClients, saveStoredClients } from "../../../lib/clientsStore";
import { Process, Stage } from "../../../lib/useProcessStore";
import { appointmentService, Appointment } from "../../../lib/appointmentService";
import { getStoredTeamMembers } from "../../../lib/teamStore";
import { getStoredServices } from "../../../lib/servicesStore";
import { findRoomForAppointment } from "../../../lib/roomsStore";
import { useOrganization } from "../../context/OrganizationContext";
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

  // ── 2. Data Sources (Services, Locations, Doctors) ──
  const services = useMemo(() => {
    const list = getStoredServices();
    return list.filter((s) => s.isActive !== false);
  }, []);

  const orgLocations = useMemo(() => {
    try {
      const saved = localStorage.getItem(`mantra_org_locations_${activeOrganization.id}`);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed.map((l: any) => l.name);
        }
      }
    } catch {}
    return activeOrganization.locations && activeOrganization.locations.length > 0
      ? activeOrganization.locations
      : [activeOrganization.location || "California"];
  }, [activeOrganization]);

  const team = useMemo(() => {
    return getStoredTeamMembers().filter((m) => m.status !== false && m.canBookAppointments !== false);
  }, []);

  // ── 3. Booking Modal State ──
  const [showBookingModal, setShowBookingModal] = useState(false);
  const [selectedServiceId, setSelectedServiceId] = useState<string>(() => String(services[0]?.id || "1"));
  const [selectedLocation, setSelectedLocation] = useState<string>(() => orgLocations[0] || "California");
  const [selectedDoctorId, setSelectedDoctorId] = useState<string>(() => String(team[0]?.id || "1"));
  const [date, setDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [time, setTime] = useState("10:30 AM");
  const [notes, setNotes] = useState("Follow-up clinical consultation");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Available doctors filtered by selected service
  const availableDoctors = useMemo(() => {
    const srv = services.find((s) => String(s.id) === String(selectedServiceId));
    if (srv && srv.assignedEmployees && srv.assignedEmployees.length > 0) {
      const assignedIds = new Set(srv.assignedEmployees.map(String));
      const filtered = team.filter((d) => assignedIds.has(String(d.id)));
      if (filtered.length > 0) return filtered;
    }
    return team;
  }, [selectedServiceId, services, team]);

  useEffect(() => {
    if (availableDoctors.length > 0 && !availableDoctors.some((d) => String(d.id) === String(selectedDoctorId))) {
      setSelectedDoctorId(String(availableDoctors[0].id));
    }
  }, [availableDoctors, selectedDoctorId]);

  // Dynamic Room Allocation based on Service, Location, Doctor
  const allocatedRoom = useMemo(() => {
    const doc = team.find((d) => String(d.id) === String(selectedDoctorId));
    return findRoomForAppointment({
      serviceId: selectedServiceId,
      location: selectedLocation,
      employeeId: selectedDoctorId,
      employeeName: doc?.name,
    });
  }, [selectedServiceId, selectedLocation, selectedDoctorId, team]);

  const selectedServiceObj = services.find((s) => String(s.id) === String(selectedServiceId)) || services[0];
  const selectedDoctorObj = team.find((d) => String(d.id) === String(selectedDoctorId)) || team[0];

  const handleCreateBooking = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeClient) return;

    setIsSubmitting(true);
    try {
      appointmentService.createAppointment(
        {
          clientName: activeClient.name,
          clientEmail: activeClient.email || "patient@example.com",
          clientPhone: activeClient.phone || "+1 (555) 123-4567",
          clientId: activeClient.id,
          employeeId: Number(selectedDoctorObj?.id) || 1,
          serviceId: Number(selectedServiceObj?.id) || 1,
          location: selectedLocation,
          date,
          time,
          duration: selectedServiceObj?.duration || 30,
          title: `${selectedServiceObj?.name || "Consultation"} with ${selectedDoctorObj?.name || "Doctor"}`,
          notes,
          roomNumber: allocatedRoom?.roomNumber,
          roomStationId: allocatedRoom?.id,
          roomName: allocatedRoom?.name,
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
      {/* ── Page Header (Clean, Zero AI Slop) ── */}
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

      {/* ── Tabs Segmented Control ── */}
      <div className="flex items-center p-1 bg-slate-100 rounded-2xl w-fit">
        <button
          type="button"
          onClick={() => setActiveTab("upcoming")}
          className={`px-4 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeTab === "upcoming"
              ? "bg-white text-slate-900 shadow-2xs"
              : "text-slate-500 hover:text-slate-900"
          }`}
        >
          Upcoming
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("past")}
          className={`px-4 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeTab === "past"
              ? "bg-white text-slate-900 shadow-2xs"
              : "text-slate-500 hover:text-slate-900"
          }`}
        >
          Past
        </button>
      </div>

      {/* ── Appointments List ── */}
      <div className="space-y-3">
        {displayAppts.length === 0 ? (
          <div className="bg-white rounded-3xl border border-dashed border-slate-200 p-10 text-center space-y-3">
            <Calendar className="w-10 h-10 text-slate-300 mx-auto" />
            <h3 className="text-sm font-bold text-slate-800">
              {activeTab === "upcoming" ? "No upcoming visits scheduled" : "No past visit history"}
            </h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              {activeTab === "upcoming"
                ? "Book a consultation or follow-up whenever you need clinical care."
                : "Completed consultation summaries and notes will be cataloged here."}
            </p>
            {activeTab === "upcoming" && (
              <button
                type="button"
                onClick={() => setShowBookingModal(true)}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-50 text-blue-700 hover:bg-blue-100 rounded-xl text-xs font-bold transition-colors cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Book now</span>
              </button>
            )}
          </div>
        ) : (
          displayAppts.map((appt) => {
            const isCompleted = appt.status === "completed";
            const apptRoom = findRoomForAppointment({
              serviceName: appt.serviceName || appt.title,
              location: appt.location,
              employeeName: appt.employeeName,
              employeeId: appt.employeeId,
            });

            return (
              <div
                key={appt.id}
                className="bg-white rounded-3xl border border-slate-200/90 p-5 hover:border-slate-300 transition-all shadow-xs space-y-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-1">
                    <span
                      className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                        isCompleted
                          ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                          : appt.status === "checked-in"
                          ? "bg-blue-50 text-blue-700 border border-blue-200"
                          : "bg-slate-100 text-slate-700"
                      }`}
                    >
                      {isCompleted ? <Check className="w-3 h-3" /> : null}
                      <span>{appt.status || "Scheduled"}</span>
                    </span>

                    <h3 className="text-base font-bold text-slate-900">
                      {appt.title || appt.serviceName || "Clinical Consultation"}
                    </h3>
                  </div>

                  <span className="text-xs font-bold font-mono text-slate-700 bg-slate-50 border border-slate-200/80 px-2.5 py-1 rounded-xl shrink-0">
                    {appt.date ? new Date(appt.date).toLocaleDateString("en-US", { month: "short", day: "numeric" }) : "Today"}
                  </span>
                </div>

                <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-100 text-xs text-slate-600 font-semibold">
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-slate-50 border border-slate-200/70 text-slate-700">
                    <Stethoscope className="w-3.5 h-3.5 text-blue-600" />
                    <span>{appt.employeeName || "Dr. Rajesh Patel"}</span>
                  </span>

                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-slate-50 border border-slate-200/70 text-slate-700">
                    <Clock className="w-3.5 h-3.5 text-slate-400" />
                    <span>{appt.time || "10:30 AM"}</span>
                  </span>

                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-slate-50 border border-slate-200/70 text-slate-700">
                    <MapPin className="w-3.5 h-3.5 text-emerald-600" />
                    <span>{appt.roomNumber ? `Room ${appt.roomNumber}` : apptRoom ? `Room ${apptRoom.roomNumber}` : appt.location || "Clinic"}</span>
                  </span>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* ── Book Appointment Modal (Clean & Modern) ── */}
      {showBookingModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
            {/* Modal Header */}
            <div className="p-5 sm:p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
              <div className="space-y-0.5">
                <h3 className="text-lg font-bold text-slate-900">Book Appointment</h3>
                <p className="text-xs text-slate-500 font-medium">Select consultation service, physician, and date</p>
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
              {/* Service Selection */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700">Service</label>
                <select
                  value={selectedServiceId}
                  onChange={(e) => setSelectedServiceId(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 cursor-pointer"
                >
                  {services.map((srv) => (
                    <option key={srv.id} value={srv.id}>
                      {srv.name} ({srv.duration || 30} mins) — ${srv.price || 75}
                    </option>
                  ))}
                </select>
              </div>

              {/* Doctor Selection */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700">Attending Physician</label>
                <select
                  value={selectedDoctorId}
                  onChange={(e) => setSelectedDoctorId(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 cursor-pointer"
                >
                  {availableDoctors.map((doc) => (
                    <option key={doc.id} value={doc.id}>
                      {doc.name} {(doc as any).specialty ? `(${(doc as any).specialty})` : ""}
                    </option>
                  ))}
                </select>
              </div>

              {/* Location & Dynamic Room Display */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700">Facility Location</label>
                  <select
                    value={selectedLocation}
                    onChange={(e) => setSelectedLocation(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 cursor-pointer"
                  >
                    {orgLocations.map((loc) => (
                      <option key={loc} value={loc}>
                        {loc}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700">Allocated Station</label>
                  <div className="w-full px-3.5 py-2.5 bg-blue-50/70 border border-blue-200 rounded-xl text-xs font-bold text-blue-700 flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                    <span className="truncate">
                      {allocatedRoom ? `Room ${allocatedRoom.roomNumber} (${allocatedRoom.name})` : "General Station"}
                    </span>
                  </div>
                </div>
              </div>

              {/* Date & Time */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700">Date</label>
                  <input
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700">Time</label>
                  <select
                    value={time}
                    onChange={(e) => setTime(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 cursor-pointer"
                  >
                    <option value="09:00 AM">09:00 AM</option>
                    <option value="09:30 AM">09:30 AM</option>
                    <option value="10:00 AM">10:00 AM</option>
                    <option value="10:30 AM">10:30 AM</option>
                    <option value="11:00 AM">11:00 AM</option>
                    <option value="11:30 AM">11:30 AM</option>
                    <option value="02:00 PM">02:00 PM</option>
                    <option value="02:30 PM">02:30 PM</option>
                    <option value="03:00 PM">03:00 PM</option>
                    <option value="03:30 PM">03:30 PM</option>
                  </select>
                </div>
              </div>

              {/* Notes */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700">Reason / Notes</label>
                <input
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="e.g. routine check-up, eye discomfort..."
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                />
              </div>

              {/* Submit CTA */}
              <div className="pt-3">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full py-3 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs transition-all shadow-sm shadow-blue-500/25 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
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
