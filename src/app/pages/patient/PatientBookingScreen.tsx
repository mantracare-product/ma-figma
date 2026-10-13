import React, { useState, useEffect, useMemo } from "react";
import { useOutletContext, useNavigate } from "react-router";
import {
  Calendar,
  Clock,
  User,
  CheckCircle2,
  ArrowRight,
  ShieldCheck,
  Stethoscope,
  Sparkles,
  MapPin,
  Building2,
  Plus,
  X,
  FileText,
} from "lucide-react";
import { Client, getStoredClients, saveStoredClients } from "../../../lib/clientsStore";
import { Process, Stage } from "../../../lib/useProcessStore";
import { appointmentService, Appointment } from "../../../lib/appointmentService";
import { getStoredTeamMembers } from "../../../lib/teamStore";
import { getStoredServices } from "../../../lib/servicesStore";
import { findRoomForAppointment, Room } from "../../../lib/roomsStore";
import { useOrganization } from "../../context/OrganizationContext";
import { toast } from "sonner";

interface PortalContext {
  activeClient: Client;
  activeProcess: Process;
  currentStageName: string;
  currentStageIndex: number;
  stages: Stage[];
  onStageChange: (newStageName: string) => void;
}

export default function PatientBookingScreen() {
  const navigate = useNavigate();
  const { activeClient } = useOutletContext<PortalContext>();
  const { activeOrganization } = useOrganization();

  // ── 1. Fetch User's Appointments ──
  const [appointments, setAppointments] = useState<Appointment[]>(() => {
    if (!activeClient) return [];
    const all = appointmentService.getAppointments();
    return all.filter(
      (a) =>
        (activeClient.id && String(a.clientId) === String(activeClient.id)) ||
        (activeClient.email && a.clientEmail?.toLowerCase() === activeClient.email.toLowerCase()) ||
        (activeClient.name && a.clientName?.toLowerCase() === activeClient.name.toLowerCase()) ||
        (activeClient.phone && a.clientPhone && a.clientPhone.replace(/\D/g, "") === activeClient.phone.replace(/\D/g, ""))
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
          (activeClient.phone && a.clientPhone && a.clientPhone.replace(/\D/g, "") === activeClient.phone.replace(/\D/g, ""))
      );
      setAppointments(userApts);
    });
  }, [activeClient]);

  // ── 2. Data Sources (Services, Locations, Doctors) matching Mantra Assist ──
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
  const [notes, setNotes] = useState("Routine check-up and follow-up consultation");
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

  // Automatically adjust doctor if not in available doctors
  useEffect(() => {
    if (availableDoctors.length > 0 && !availableDoctors.some((d) => String(d.id) === String(selectedDoctorId))) {
      setSelectedDoctorId(String(availableDoctors[0].id));
    }
  }, [availableDoctors, selectedDoctorId]);

  // Dynamic Room Allocation based on Service, Location, and Doctor
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
      const res = appointmentService.createAppointment(
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

      // Update patient stage in clientsStore
      const all = getStoredClients();
      const updated = all.map((c) =>
        c.id === activeClient.id
          ? {
              ...c,
              stage: "Appointment Booked",
              processes: Array.from(new Set(["Patient Care Journey", ...(c.processes || [])])),
            }
          : c
      );
      saveStoredClients(updated);

      toast.success("Appointment successfully booked!");
      setShowBookingModal(false);
    } catch (err: any) {
      toast.error(err?.message || "Failed to schedule appointment");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* ── Header with Title & Book Appointment CTA ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-blue-50 border border-blue-200 text-blue-700 text-xs font-semibold mb-1">
            <Calendar className="w-3.5 h-3.5" />
            <span>Patient Portal • My Appointments</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900" style={{ fontFamily: "Outfit, sans-serif" }}>
            My Appointments
          </h1>
          <p className="text-xs text-slate-500">
            View your consultation schedule, allocated room details, and clinic walking guidance.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setShowBookingModal(true)}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-all shadow-xs cursor-pointer active:scale-95 shrink-0"
          style={{ fontFamily: "Outfit, sans-serif" }}
        >
          <Plus className="w-4 h-4" />
          <span>Book Appointment</span>
        </button>
      </div>

      {/* ── Appointments List ── */}
      {appointments.length > 0 ? (
        <div className="grid grid-cols-1 gap-4">
          {appointments.map((apt) => {
            const matchedDoctor = team.find((d) => String(d.id) === String(apt.employeeId));
            const doctorDisplay = apt.employeeName || matchedDoctor?.name || `Doctor #${apt.employeeId}`;

            // Resolve allocated room directions if saved or dynamic
            const resolvedRoom = apt.roomNumber
              ? findRoomForAppointment({
                  serviceId: apt.serviceId,
                  location: apt.location,
                  employeeId: apt.employeeId,
                })
              : null;

            return (
              <div
                key={apt.id}
                className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-xs hover:border-blue-300 transition-all space-y-4"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200">
                      #{apt.id}
                    </span>
                    <h3 className="text-sm font-bold text-slate-900" style={{ fontFamily: "Outfit, sans-serif" }}>
                      {apt.title || apt.serviceName || "Clinical Consultation"}
                    </h3>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                      {apt.source === "MA-Client" ? "Patient Portal" : apt.source || "Scheduled"}
                    </span>
                    <span
                      className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider ${
                        apt.status === "completed"
                          ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                          : apt.status === "checked-in"
                          ? "bg-indigo-50 text-indigo-700 border border-indigo-200"
                          : "bg-blue-50 text-blue-700 border border-blue-200"
                      }`}
                    >
                      {apt.statusLabel || apt.status}
                    </span>
                  </div>
                </div>

                {/* Details Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 text-xs bg-slate-50/70 p-3.5 rounded-xl border border-slate-100">
                  <div className="space-y-0.5">
                    <span className="text-slate-400 font-medium flex items-center gap-1 text-[11px]">
                      <Calendar className="w-3.5 h-3.5 text-slate-400" /> Date & Time
                    </span>
                    <p className="font-semibold text-slate-800">
                      {apt.date} at {apt.time}
                    </p>
                  </div>

                  <div className="space-y-0.5">
                    <span className="text-slate-400 font-medium flex items-center gap-1 text-[11px]">
                      <User className="w-3.5 h-3.5 text-slate-400" /> Practitioner
                    </span>
                    <p className="font-semibold text-slate-800">{doctorDisplay}</p>
                  </div>

                  <div className="space-y-0.5">
                    <span className="text-slate-400 font-medium flex items-center gap-1 text-[11px]">
                      <MapPin className="w-3.5 h-3.5 text-slate-400" /> Location
                    </span>
                    <p className="font-semibold text-slate-800">{apt.location || "California Branch"}</p>
                  </div>

                  <div className="space-y-0.5">
                    <span className="text-slate-400 font-medium flex items-center gap-1 text-[11px]">
                      <Building2 className="w-3.5 h-3.5 text-blue-600" /> Allocated Room
                    </span>
                    <p className="font-bold text-blue-700">
                      {apt.roomNumber ? `Room #${apt.roomNumber}` : "Room #101"}
                    </p>
                  </div>
                </div>

                {/* Walking Guidance Snippet */}
                {(apt.roomNumber || resolvedRoom?.direction) && (
                  <div className="p-3 rounded-xl bg-blue-50/50 border border-blue-100 flex items-start gap-2.5">
                    <div className="w-6 h-6 rounded-md bg-blue-600 text-white flex items-center justify-center font-bold text-[10px] shrink-0 mt-0.5">
                      #{apt.roomNumber || resolvedRoom?.roomNumber || "101"}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-slate-800">
                        {apt.roomName || resolvedRoom?.name || "Consultation Room"}
                      </p>
                      <p className="text-[11px] text-slate-600 mt-0.5 leading-relaxed">
                        <strong className="text-slate-700">Walking Guidance:</strong>{" "}
                        {resolvedRoom?.direction ||
                          "Proceed past the main reception counter, turn left into Clinical Wing A; the room is on your right."}
                      </p>
                    </div>
                  </div>
                )}

                {apt.notes && (
                  <div className="text-xs text-slate-500 pt-1 flex items-start gap-1.5">
                    <FileText className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                    <span>{apt.notes}</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200/80 p-8 sm:p-12 text-center space-y-4">
          <div className="w-14 h-14 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mx-auto border border-blue-200">
            <Calendar className="w-7 h-7" />
          </div>
          <div className="space-y-1">
            <h3 className="text-base font-bold text-slate-900" style={{ fontFamily: "Outfit, sans-serif" }}>
              No Appointments Scheduled Yet
            </h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              Schedule your clinic consultation with any of our specialists. Your allocated room and walking guidance will appear right here.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setShowBookingModal(true)}
            className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-all shadow-xs cursor-pointer"
            style={{ fontFamily: "Outfit, sans-serif" }}
          >
            <Plus className="w-4 h-4" />
            <span>Book Your First Consultation</span>
          </button>
        </div>
      )}

      {/* ── Book Appointment Modal (Matching Mantra Assist Fields) ── */}
      {showBookingModal && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/50 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-xl w-full max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-5 border-b border-slate-200 sticky top-0 bg-white z-10">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center border border-blue-100">
                  <Calendar className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900" style={{ fontFamily: "Outfit, sans-serif" }}>
                    Book Clinic Consultation
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Follows Mantra Assist rules with auto-allocated room & live sync
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowBookingModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleCreateBooking} className="p-5 space-y-4">
              {/* Field 1: Service */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1" style={{ fontFamily: "Outfit, sans-serif" }}>
                  1. Clinical Service <span className="text-red-500">*</span>
                </label>
                <select
                  value={selectedServiceId}
                  onChange={(e) => setSelectedServiceId(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-xs font-medium text-slate-800 bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                  style={{ fontFamily: "Outfit, sans-serif" }}
                >
                  {services.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} ({s.duration} min • ${s.price})
                    </option>
                  ))}
                </select>
              </div>

              {/* Field 2: Location */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1" style={{ fontFamily: "Outfit, sans-serif" }}>
                  2. Clinic Location <span className="text-red-500">*</span>
                </label>
                <select
                  value={selectedLocation}
                  onChange={(e) => setSelectedLocation(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-xs font-medium text-slate-800 bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                  style={{ fontFamily: "Outfit, sans-serif" }}
                >
                  {orgLocations.map((loc) => (
                    <option key={loc} value={loc}>
                      {loc}
                    </option>
                  ))}
                </select>
              </div>

              {/* Field 3: Responsible Doctor */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1" style={{ fontFamily: "Outfit, sans-serif" }}>
                  3. Responsible Practitioner <span className="text-red-500">*</span>
                </label>
                <select
                  value={selectedDoctorId}
                  onChange={(e) => setSelectedDoctorId(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-xs font-medium text-slate-800 bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                  style={{ fontFamily: "Outfit, sans-serif" }}
                >
                  {availableDoctors.map((doc) => (
                    <option key={doc.id} value={doc.id}>
                      {doc.name} ({doc.role || "Specialist"})
                    </option>
                  ))}
                </select>
              </div>

              {/* Dynamic Auto-allocated Room Box */}
              {allocatedRoom && (
                <div className="p-3 rounded-xl border border-blue-200/90 bg-blue-50/60 flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-xs">
                    #{allocatedRoom.roomNumber}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-bold text-slate-900">{allocatedRoom.name}</span>
                      <span className="text-[10px] font-semibold bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded border border-blue-200">
                        Auto-allocated Room
                      </span>
                      <span className="text-[11px] text-slate-500 font-medium">
                        • {allocatedRoom.location}
                      </span>
                    </div>
                    {allocatedRoom.direction && (
                      <p className="text-[11px] text-slate-600 mt-1 leading-snug">
                        <strong className="text-slate-700">Walking Guidance:</strong> {allocatedRoom.direction}
                      </p>
                    )}
                  </div>
                </div>
              )}

              {/* Field 4: Date & Time */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1" style={{ fontFamily: "Outfit, sans-serif" }}>
                    Preferred Date <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-xs font-medium text-slate-800 bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                    style={{ fontFamily: "Outfit, sans-serif" }}
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1" style={{ fontFamily: "Outfit, sans-serif" }}>
                    Time Slot <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={time}
                    onChange={(e) => setTime(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-xs font-medium text-slate-800 bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                    style={{ fontFamily: "Outfit, sans-serif" }}
                  >
                    <option value="09:00 AM">09:00 AM</option>
                    <option value="10:30 AM">10:30 AM</option>
                    <option value="11:45 AM">11:45 AM</option>
                    <option value="02:15 PM">02:15 PM</option>
                    <option value="04:00 PM">04:00 PM</option>
                  </select>
                </div>
              </div>

              {/* Field 5: Clinical Notes */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1" style={{ fontFamily: "Outfit, sans-serif" }}>
                  Clinical Reason / Notes
                </label>
                <textarea
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Optional symptoms or consultation reason..."
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-xs font-medium text-slate-800 bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 resize-none"
                  style={{ fontFamily: "Outfit, sans-serif" }}
                />
              </div>

              {/* Modal Footer */}
              <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowBookingModal(false)}
                  className="px-4 py-2 border border-gray-200 rounded-lg text-xs font-medium text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
                  style={{ fontFamily: "Outfit, sans-serif" }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold transition-all shadow-xs cursor-pointer disabled:opacity-50"
                  style={{ fontFamily: "Outfit, sans-serif" }}
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>{isSubmitting ? "Booking..." : "Confirm Booking"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
