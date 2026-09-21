import React, { useState, useEffect } from "react";
import {
  Calendar,
  Clock,
  Plus,
  QrCode,
  X,
  CheckCircle2,
} from "lucide-react";
import {
  getAppointmentsByClient,
  updateAppointmentStatus,
  rescheduleAppointment,
  APPOINTMENTS_STORE_EVENT,
  Appointment,
} from "../../../lib/appointmentsStore";
import { setClientProcessStage } from "../../../lib/clientProcessState";
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
  const [selectedQRPassAppt, setSelectedQRPassAppt] = useState<Appointment | null>(null);
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

  const handleSimulateArrival = (appt: Appointment) => {
    updateAppointmentStatus(appt.id, "arrived");
    if (appt.processId) {
      setClientProcessStage(clientId, {
        processId: appt.processId,
        processName: appt.serviceName || "Cataract Surgery Daycare",
        stageId: appt.stageId || "cat-1",
        stageName: "Checked In",
      });
    }
    toast.success("Arrival confirmed with Dr. Meera Nair");
    setSelectedQRPassAppt(null);
  };

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

            return (
              <div
                key={appt.id}
                className={`p-4 rounded-2xl transition-all flex items-center justify-between gap-4 ${
                  isFirst
                    ? "bg-white dark:bg-[#151c24] border border-blue-200/80 dark:border-blue-900/60 shadow-xs ring-1 ring-blue-500/10"
                    : "bg-white dark:bg-[#151c24] border border-slate-200/80 dark:border-slate-800"
                }`}
              >
                <div className="space-y-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-sm text-slate-900 dark:text-white truncate">
                      {appt.title || appt.serviceName}
                    </span>
                    {isFirst && (
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-blue-50 text-[#1456f0] dark:bg-blue-950/60 dark:text-blue-300">
                        Arrival day
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-slate-500 dark:text-slate-400">
                    Dr. Meera Nair &nbsp;·&nbsp;{" "}
                    <span className="font-medium text-slate-700 dark:text-slate-300">
                      {appt.date.includes("2026-09-21")
                        ? "Sept 21"
                        : appt.date.includes("2026-09-22")
                        ? "Sept 22"
                        : appt.date}
                      , {appt.time}
                    </span>
                  </div>
                </div>

                {/* Actions per spec */}
                <div className="flex items-center gap-3 shrink-0">
                  <button
                    type="button"
                    onClick={() => setSelectedQRPassAppt(appt)}
                    className="cursor-pointer text-xs font-semibold text-[#1456f0] hover:text-blue-700 hover:underline px-2 py-1 rounded-md"
                  >
                    View pass
                  </button>

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

      {/* Arrival QR Pass Modal */}
      {selectedQRPassAppt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white dark:bg-[#151c24] rounded-2xl max-w-sm w-full p-6 shadow-xl space-y-4 border border-slate-200 dark:border-slate-800 text-center relative">
            <button
              type="button"
              onClick={() => setSelectedQRPassAppt(null)}
              className="absolute top-4 right-4 p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>

            <div>
              <div className="text-xs font-semibold text-[#1456f0] uppercase tracking-wider mb-0.5">
                Arrival Pass
              </div>
              <h3 className="font-semibold text-base text-slate-900 dark:text-white">
                {selectedQRPassAppt.title || selectedQRPassAppt.serviceName}
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Dr. Meera Nair · EyeMantra
              </p>
            </div>

            <div className="py-2 flex justify-center">
              <div className="p-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs">
                <QrCode className="w-36 h-36 text-slate-900 dark:text-slate-100" />
              </div>
            </div>

            <div className="text-xs space-y-1.5 py-2 border-y border-slate-100 dark:border-slate-800 text-left">
              <div className="flex justify-between">
                <span className="text-slate-500">Patient</span>
                <span className="font-medium text-slate-900 dark:text-white">{clientName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Scheduled Time</span>
                <span className="font-medium text-slate-900 dark:text-white">
                  {selectedQRPassAppt.date} · {selectedQRPassAppt.time}
                </span>
              </div>
            </div>

            <div className="pt-1 flex flex-col gap-2">
              <button
                type="button"
                onClick={() => handleSimulateArrival(selectedQRPassAppt)}
                className="w-full py-2.5 rounded-xl bg-[#1456f0] hover:bg-blue-700 text-white text-xs font-semibold shadow-xs cursor-pointer active:scale-95 transition-all"
              >
                Confirm Arrival Check-In
              </button>
              <button
                type="button"
                onClick={() => setSelectedQRPassAppt(null)}
                className="w-full py-2 rounded-xl text-xs font-medium text-slate-500 hover:text-slate-800 cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
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
