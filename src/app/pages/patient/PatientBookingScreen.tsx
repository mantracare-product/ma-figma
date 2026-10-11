import React, { useState, useEffect } from "react";
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
} from "lucide-react";
import { Client, getStoredClients, saveStoredClients } from "../../../lib/clientsStore";
import { Process, Stage } from "../../../lib/useProcessStore";
import { appointmentService } from "../../../lib/appointmentService";
import { getStoredTeamMembers } from "../../../lib/teamStore";

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
  const { activeClient, onStageChange } = useOutletContext<PortalContext>();

  const team = getStoredTeamMembers().filter((m) => m.status !== false);
  const activeDoctors = team.filter((m) => m.canBookAppointments !== false);
  const doctorList = activeDoctors.length > 0 ? activeDoctors : team.slice(0, 3);

  const [service, setService] = useState("General Health Consultation");
  const [doctorId, setDoctorId] = useState(String(doctorList[0]?.id || "1"));
  const [date, setDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [time, setTime] = useState("10:30");
  const [notes, setNotes] = useState("Routine check-up and follow-up consultation");
  const [bookedSuccess, setBookedSuccess] = useState(false);
  const [createdApptId, setCreatedApptId] = useState<string | number | null>(null);

  const selectedDoctor = doctorList.find((d) => String(d.id) === String(doctorId)) || doctorList[0];

  const handleBookAppointment = () => {
    if (!activeClient) return;

    // Call canonical appointment service
    const res = appointmentService.createAppointment(
      {
        clientName: activeClient.name,
        clientEmail: activeClient.email || "patient@example.com",
        clientPhone: activeClient.phone || "+1 (555) 123-4567",
        clientId: activeClient.id,
        employeeId: selectedDoctor?.id || 1,
        serviceId: 1,
        date,
        time,
        duration: 30,
        title: `${service} with ${selectedDoctor?.name || "Dr. John Smith"}`,
        notes,
        source: "screen",
      },
      { force: true, createdBy: "user" }
    );

    // Advance patient stage to "Book Appointment" in clientsStore
    const all = getStoredClients();
    const updated = all.map((c) =>
      c.id === activeClient.id
        ? { ...c, stage: "Book Appointment", processes: Array.from(new Set(["Patient Care Journey", ...(c.processes || [])])) }
        : c
    );
    saveStoredClients(updated);

    if (res?.appointment?.id) {
      setCreatedApptId(res.appointment.id);
    }
    setBookedSuccess(true);
  };

  const handleContinueToPharmacy = () => {
    // Advance stage to Move to Pharmacy
    const all = getStoredClients();
    const updated = all.map((c) =>
      c.id === activeClient.id
        ? { ...c, stage: "Move to Pharmacy", processes: Array.from(new Set(["Patient Care Journey", ...(c.processes || [])])) }
        : c
    );
    saveStoredClients(updated);
    navigate("/patient/pharmacy");
  };

  return (
    <div className="max-w-3xl mx-auto space-y-8">
      {/* Header */}
      <div className="text-center space-y-2">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 border border-blue-200/80 text-blue-800 text-xs font-semibold">
          <Calendar className="w-3.5 h-3.5 text-blue-600" />
          <span>Stage 2 of 5 • Book Appointment</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">
          Book Clinic Consultation
        </h1>
        <p className="text-sm text-slate-500 max-w-lg mx-auto">
          Schedule your clinical consultation. The booking writes directly to <code className="text-xs bg-slate-100 px-1 py-0.5 rounded font-mono">appointmentService.ts</code> and syncs across all views.
        </p>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200/80 p-6 sm:p-8 shadow-xs">
        {bookedSuccess ? (
          <div className="text-center py-6 space-y-5">
            <div className="w-16 h-16 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto border border-emerald-200">
              <CheckCircle2 className="w-10 h-10" />
            </div>

            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-600">
                Appointment Confirmed
              </span>
              <h2 className="text-xl font-bold text-slate-900 mt-1">
                Booking Reference #{createdApptId || "102"}
              </h2>
              <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
                Consultation confirmed with {selectedDoctor?.name || "Dr. John Smith"} on {date} at {time}. Client stage updated to <strong>Book Appointment</strong>.
              </p>
            </div>

            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/70 max-w-md mx-auto text-left text-xs space-y-2">
              <div className="flex justify-between">
                <span className="text-slate-400">Doctor:</span>
                <span className="font-semibold text-slate-800">{selectedDoctor?.name || "Dr. John Smith"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Service:</span>
                <span className="font-semibold text-slate-800">{service}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Schedule:</span>
                <span className="font-semibold text-slate-800">{date} at {time}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Current Client Stage:</span>
                <span className="font-semibold text-blue-700 bg-blue-50 px-2 py-0.5 rounded">
                  Book Appointment
                </span>
              </div>
            </div>

            <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
              <button
                type="button"
                onClick={handleContinueToPharmacy}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm shadow-sm transition-all"
              >
                <span>Continue to Pharmacy (Stage 3)</span>
                <ArrowRight className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => navigate("/patient")}
                className="w-full sm:w-auto px-5 py-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-sm transition-colors"
              >
                View Care Status
              </button>
            </div>
          </div>
        ) : (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleBookAppointment();
            }}
            className="space-y-6"
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              {/* Service Select */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700">Consultation Service</label>
                <select
                  value={service}
                  onChange={(e) => setService(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                >
                  <option value="General Health Consultation">General Health Consultation</option>
                  <option value="Cardiology Consultation">Cardiology Consultation</option>
                  <option value="Orthopedic Review">Orthopedic Review</option>
                  <option value="Pediatric Check-Up">Pediatric Check-Up</option>
                </select>
              </div>

              {/* Provider Select */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700">Assigned Physician</label>
                <select
                  value={doctorId}
                  onChange={(e) => setDoctorId(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                >
                  {doctorList.map((doc) => (
                    <option key={doc.id} value={doc.id}>
                      {doc.name} ({doc.role || "Specialist"})
                    </option>
                  ))}
                </select>
              </div>

              {/* Date */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700">Preferred Date</label>
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
              </div>

              {/* Time Slot */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700">Time Slot</label>
                <select
                  value={time}
                  onChange={(e) => setTime(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                >
                  <option value="09:00">09:00 AM</option>
                  <option value="10:30">10:30 AM</option>
                  <option value="11:45">11:45 AM</option>
                  <option value="02:15">02:15 PM</option>
                  <option value="04:00">04:00 PM</option>
                </select>
              </div>
            </div>

            {/* Notes */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700">Reason / Clinical Notes</label>
              <textarea
                rows={2}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full px-3.5 py-2 rounded-xl border border-slate-200 bg-white text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                placeholder="Optional notes for the doctor..."
              />
            </div>

            {/* Actions */}
            <div className="pt-2 space-y-3">
              <button
                type="submit"
                className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-semibold shadow-sm transition-all active:scale-[0.98]"
              >
                <Calendar className="w-4 h-4" />
                <span>Confirm Booking & Advance to Stage 2</span>
              </button>

              <div className="text-center text-[11px] text-slate-400 flex items-center justify-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                <span>Synchronizes directly into appointmentService.ts & clientsStore.ts</span>
              </div>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
