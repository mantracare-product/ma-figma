import React, { useState, useEffect } from "react";
import {
  Calendar,
  Clock,
  Plus,
  X,
  CheckCircle2,
  Video,
  MapPin,
  Building2,
  ExternalLink,
} from "lucide-react";
import {
  getAppointmentsByClient,
  updateAppointmentStatus,
  rescheduleAppointment,
  APPOINTMENTS_STORE_EVENT,
  Appointment,
} from "../../../lib/appointmentsStore";
import { onSyncEvent } from "../../../lib/syncBroadcast";
import BookAppointmentModal from "./components/BookAppointmentModal";
import { toast } from "sonner";

interface PatientAppointmentsProps {
  clientId: string;
  clientName: string;
  clientEmail: string;
  clientPhone: string;
}

export default function PatientAppointments({
  clientId,
  clientName,
  clientEmail,
  clientPhone,
}: PatientAppointmentsProps) {
  const [appointments, setAppointments] = useState<Appointment[]>(() => {
    const list = getAppointmentsByClient(clientName);
    return list.length > 0 ? list : getAppointmentsByClient("Ramesh");
  });
  const [activeTab, setActiveTab] = useState<"upcoming" | "past">("upcoming");
  const [isBookModalOpen, setIsBookModalOpen] = useState(false);
  const [reschedulingApptId, setReschedulingApptId] = useState<number | null>(null);
  const [newRescheduleDate, setNewRescheduleDate] = useState("2026-09-23");
  const [newRescheduleTime, setNewRescheduleTime] = useState("10:30 AM");

  useEffect(() => {
    const handleSync = () => {
      const list = getAppointmentsByClient(clientName);
      setAppointments(list.length > 0 ? list : getAppointmentsByClient("Ramesh"));
    };

    window.addEventListener(APPOINTMENTS_STORE_EVENT, handleSync);
    window.addEventListener("storage", handleSync);
    const unsub = onSyncEvent("APPOINTMENTS_UPDATED", handleSync);

    return () => {
      window.removeEventListener(APPOINTMENTS_STORE_EVENT, handleSync);
      window.removeEventListener("storage", handleSync);
      unsub();
    };
  }, [clientName]);

  const upcoming = appointments.filter(
    (a) => a.status === "scheduled" || a.status === "pending-accept" || a.status === "arrived"
  );
  const past = appointments.filter(
    (a) => a.status === "completed" || a.status === "cancelled" || a.status === "no-show"
  );


  const handleRescheduleSubmit = (id: number) => {
    if (!newRescheduleDate) {
      toast.error("Please pick a valid reschedule date");
      return;
    }
    rescheduleAppointment(id, newRescheduleDate, newRescheduleTime);
    setReschedulingApptId(null);
    toast.success("Appointment rescheduled successfully");
  };

  return (
    <div className="w-full space-y-6 select-none animate-in fade-in duration-200">
      {/* Header — Rule 0 & §1: One heading, no restating subtext */}
      <div className="flex items-center justify-between gap-4">
        <h1 className="font-display font-semibold text-xl tracking-tight text-slate-900 dark:text-white">
          Visits
        </h1>

        {/* Primary action: only button-styled element above the fold */}
        <button
          type="button"
          onClick={() => setIsBookModalOpen(true)}
          className="cursor-pointer inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-[#1456f0] hover:bg-blue-700 text-white text-xs font-semibold shadow-xs transition-all active:scale-95"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Book appointment</span>
        </button>
      </div>

      {/* Tabs — Rule §1: plain Upcoming / Past */}
      <div className="flex border-b border-slate-200/80 dark:border-slate-800 gap-6">
        <button
          type="button"
          onClick={() => setActiveTab("upcoming")}
          className={`pb-2.5 text-xs font-semibold border-b-2 transition-all cursor-pointer ${
            activeTab === "upcoming"
              ? "border-[#1456f0] text-[#1456f0]"
              : "border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-white"
          }`}
        >
          Upcoming
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("past")}
          className={`pb-2.5 text-xs font-semibold border-b-2 transition-all cursor-pointer ${
            activeTab === "past"
              ? "border-[#1456f0] text-[#1456f0]"
              : "border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-white"
          }`}
        >
          Past
        </button>
      </div>

      {/* Content */}
      {activeTab === "upcoming" ? (
        <div className="space-y-2.5">
          {upcoming.map((appt, idx) => {
            const isFirst = idx === 0;
            const isSurgery = appt.serviceName?.includes("Cataract") || appt.id === 1;
            const isVideo = appt.type === "video";
            const locationLabel =
              appt.locationCode === "PV"
                ? "Paschim Vihar (PV)"
                : appt.locationCode === "NOIDA"
                ? "Noida (Sec 62)"
                : appt.locationCode === "BAHADURGARH"
                ? "Bahadurgarh"
                : appt.location || "EyeMantra (PV)";

            return (
              <div
                key={appt.id}
                className={`p-4 rounded-2xl transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
                  isFirst
                    ? "bg-white dark:bg-[#151c24] border border-blue-200/80 dark:border-blue-900/60 shadow-xs ring-1 ring-blue-500/10"
                    : "bg-white dark:bg-[#151c24] border border-slate-200/80 dark:border-slate-800"
                }`}
              >
                <div className="space-y-1.5 min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-semibold text-sm text-slate-900 dark:text-white truncate">
                      {appt.title || appt.serviceName}
                    </span>

                    {/* Mode badge: Video vs In-Person */}
                    {isVideo ? (
                      <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-purple-50 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300 border border-purple-200/60 dark:border-purple-900/60">
                        <Video className="w-2.5 h-2.5" />
                        <span>Video Consult</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-blue-50 text-[#1456f0] dark:bg-blue-950/60 dark:text-blue-300 border border-blue-200/60 dark:border-blue-900/60">
                        <MapPin className="w-2.5 h-2.5" />
                        <span>{locationLabel}</span>
                      </span>
                    )}

                    {isFirst && !isVideo && (
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300">
                        Arrival day
                      </span>
                    )}
                  </div>

                  <div className="text-xs text-slate-500 dark:text-slate-400 flex flex-wrap items-center gap-x-2 gap-y-1">
                    <span className="font-medium text-slate-800 dark:text-slate-200">
                      {appt.doctorName || "Dr. Meera Nair"}
                    </span>
                    <span>&nbsp;·&nbsp;</span>
                    <span className="font-medium text-slate-700 dark:text-slate-300">
                      {appt.date.includes("2026-09-21")
                        ? "Sept 21"
                        : appt.date.includes("2026-09-22")
                        ? "Sept 22"
                        : appt.date}
                      , {appt.time}
                    </span>
                    {isVideo && (
                      <>
                        <span>&nbsp;·&nbsp;</span>
                        <span className="text-purple-600 dark:text-purple-400 font-medium">
                          Link emailed to both
                        </span>
                      </>
                    )}
                  </div>
                </div>

                {/* Actions per spec */}
                <div className="flex items-center gap-2 sm:gap-3 shrink-0 self-end sm:self-center">
                  {isVideo && appt.meetingLink && (
                    <button
                      type="button"
                      onClick={() => window.open(appt.meetingLink, "_blank")}
                      className="cursor-pointer inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-semibold shadow-xs transition-all active:scale-95"
                    >
                      <Video className="w-3.5 h-3.5" />
                      <span>Join Call</span>
                    </button>
                  )}

                  {/* Reschedule on subsequent appointments */}
                  {!isSurgery && (
                    <button
                      type="button"
                      onClick={() => setReschedulingApptId(appt.id)}
                      className="cursor-pointer text-xs text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 px-2 py-1"
                    >
                      Reschedule
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* Rule §1 Past tab: empty for this demo ("Nothing here yet", one line) */
        <div className="py-12 text-center text-xs text-slate-400 dark:text-slate-500 font-medium">
          Nothing here yet
        </div>
      )}



      {/* Reschedule Modal (Flow 9) */}
      {reschedulingApptId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white dark:bg-[#151c24] rounded-2xl max-w-sm w-full p-5 shadow-xl space-y-4 border border-slate-200 dark:border-slate-800 text-left relative">
            <button
              type="button"
              onClick={() => setReschedulingApptId(null)}
              className="absolute top-4 right-4 p-1.5 rounded-lg text-slate-400 hover:text-slate-700 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>

            <div>
              <h3 className="font-semibold text-base text-slate-900 dark:text-white">
                Reschedule Post-Op Review
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Surgeon: Dr. Meera Nair
              </p>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                  New Date
                </label>
                <input
                  type="date"
                  value={newRescheduleDate}
                  onChange={(e) => setNewRescheduleDate(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 text-xs bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                  Available Slot
                </label>
                <select
                  value={newRescheduleTime}
                  onChange={(e) => setNewRescheduleTime(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 text-xs bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                >
                  <option value="09:00 AM">09:00 AM</option>
                  <option value="10:30 AM">10:30 AM</option>
                  <option value="02:00 PM">02:00 PM</option>
                  <option value="04:00 PM">04:00 PM</option>
                </select>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setReschedulingApptId(null)}
                className="px-3.5 py-2 rounded-xl text-xs font-medium text-slate-500 hover:text-slate-800 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => handleRescheduleSubmit(reschedulingApptId)}
                className="px-4 py-2 rounded-xl bg-[#1456f0] hover:bg-blue-700 text-white text-xs font-semibold shadow-xs cursor-pointer active:scale-95"
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Book Appointment Modal (Flow 8) */}
      <BookAppointmentModal
        isOpen={isBookModalOpen}
        onClose={() => setIsBookModalOpen(false)}
        clientName={clientName}
        clientEmail={clientEmail}
        clientPhone={clientPhone}
        onBookingComplete={() => {
          setAppointments(getAppointmentsByClient(clientName));
        }}
      />
    </div>
  );
}
