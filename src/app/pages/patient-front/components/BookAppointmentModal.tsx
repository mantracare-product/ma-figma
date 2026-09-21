import React, { useState } from "react";
import {
  X,
  Calendar,
  Clock,
  CheckCircle2,
  User,
  ArrowRight,
} from "lucide-react";
import { createNewAppointment, Appointment } from "../../../../lib/appointmentsStore";
import { toast } from "sonner";

interface BookAppointmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  clientName: string;
  clientEmail: string;
  clientPhone: string;
  onBookingComplete: (appt: Appointment) => void;
}

const REASONS = [
  { id: "follow-up", title: "Follow-up", desc: "Post-procedure recovery check with Dr. Meera Nair" },
  { id: "new-concern", title: "New concern", desc: "Consult Dr. Nair regarding vision changes or questions" },
];

const TIME_SLOTS = ["09:00 AM", "10:00 AM", "11:30 AM", "02:00 PM", "03:30 PM", "04:30 PM"];

export default function BookAppointmentModal({
  isOpen,
  onClose,
  clientName,
  clientEmail,
  clientPhone,
  onBookingComplete,
}: BookAppointmentModalProps) {
  const [selectedReason, setSelectedReason] = useState(REASONS[0].id);

  // Generate upcoming calendar days (starting tomorrow)
  const today = new Date();
  const calendarDays = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(today.getDate() + i + 1);
    return {
      dateString: d.toISOString().split("T")[0],
      dayName: d.toLocaleDateString("en-US", { weekday: "short" }),
      dayNumber: d.getDate(),
      monthName: d.toLocaleDateString("en-US", { month: "short" }),
    };
  });

  const [selectedDay, setSelectedDay] = useState(calendarDays[0]);
  const [selectedSlot, setSelectedSlot] = useState(TIME_SLOTS[1]);
  const [notes, setNotes] = useState("");

  if (!isOpen) return null;

  const handleConfirm = () => {
    const reasonObj = REASONS.find((r) => r.id === selectedReason) || REASONS[0];
    const newAppt = createNewAppointment({
      clientName: clientName || "Ramesh Iyer",
      clientEmail: clientEmail || "ramesh.iyer@email.com",
      clientPhone: clientPhone || "+91 98765 43210",
      employeeId: 1,
      doctorName: "Dr. Meera Nair",
      serviceId: selectedReason === "follow-up" ? 2 : 1,
      serviceName: `${reasonObj.title} with Dr. Meera Nair`,
      title: `${reasonObj.title} with Dr. Meera Nair`,
      date: selectedDay.dateString,
      time: selectedSlot.replace(" AM", "").replace(" PM", ""),
      duration: 30,
      status: "scheduled",
      processId: "op-cataract",
      notes: notes || reasonObj.desc,
      location: "Cornea & Refractive Clinic - Bay 2",
    });

    toast.success("Appointment booked with Dr. Meera Nair");
    onBookingComplete(newAppt);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="relative w-full max-w-lg bg-white dark:bg-[#151c24] rounded-2xl shadow-xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-950/60 text-[#1456f0] flex items-center justify-center">
              <Calendar className="w-4 h-4" />
            </div>
            <div>
              <h2 className="font-semibold text-slate-900 dark:text-white text-base">
                Book appointment
              </h2>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 overflow-y-auto max-h-[70vh] space-y-5">
          {/* Provider Card (Fixed to Dr. Meera Nair) */}
          <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800">
            <div className="w-9 h-9 rounded-full bg-blue-100 dark:bg-blue-950 flex items-center justify-center text-[#1456f0]">
              <User className="w-4 h-4" />
            </div>
            <div>
              <div className="text-xs font-semibold text-slate-900 dark:text-white">
                Dr. Meera Nair
              </div>
              <div className="text-[11px] text-slate-500 dark:text-slate-400">
                Ophthalmologist · EyeMantra
              </div>
            </div>
          </div>

          {/* Reason Selection */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-2">
              Reason for visit
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {REASONS.map((reason) => {
                const isSelected = selectedReason === reason.id;
                return (
                  <button
                    key={reason.id}
                    type="button"
                    onClick={() => setSelectedReason(reason.id)}
                    className={`p-3 rounded-xl border text-left text-xs transition-all cursor-pointer ${
                      isSelected
                        ? "bg-blue-50 dark:bg-blue-950/40 border-[#1456f0] text-slate-900 dark:text-white ring-1 ring-[#1456f0]"
                        : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:border-slate-300"
                    }`}
                  >
                    <div className="flex items-center justify-between font-semibold mb-0.5">
                      <span>{reason.title}</span>
                      {isSelected && <CheckCircle2 className="w-3.5 h-3.5 text-[#1456f0]" />}
                    </div>
                    <div className="text-[11px] text-slate-500 dark:text-slate-400 leading-tight">
                      {reason.desc}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Date Picker */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-2">
              Select date
            </label>
            <div className="grid grid-cols-4 sm:grid-cols-7 gap-1.5">
              {calendarDays.map((day) => {
                const isSelected = selectedDay.dateString === day.dateString;
                return (
                  <button
                    key={day.dateString}
                    type="button"
                    onClick={() => setSelectedDay(day)}
                    className={`p-2 rounded-xl border text-center transition-all cursor-pointer ${
                      isSelected
                        ? "bg-[#1456f0] text-white border-[#1456f0] shadow-xs"
                        : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:border-slate-300"
                    }`}
                  >
                    <div className="text-[10px] uppercase font-semibold opacity-70">
                      {day.dayName}
                    </div>
                    <div className="text-sm font-bold my-0.5">
                      {day.dayNumber}
                    </div>
                    <div className="text-[10px] opacity-70">
                      {day.monthName}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Time Slot Picker */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-2">
              Available slots
            </label>
            <div className="grid grid-cols-3 gap-2">
              {TIME_SLOTS.map((slot) => {
                const isSelected = selectedSlot === slot;
                return (
                  <button
                    key={slot}
                    type="button"
                    onClick={() => setSelectedSlot(slot)}
                    className={`py-2 px-2.5 rounded-xl border text-xs font-medium text-center transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                      isSelected
                        ? "bg-blue-50 dark:bg-blue-950/50 border-[#1456f0] text-[#1456f0] font-semibold"
                        : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:border-slate-300"
                    }`}
                  >
                    <Clock className="w-3 h-3 text-slate-400" />
                    <span>{slot}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Optional Notes */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              Note for Dr. Nair (optional)
            </label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Questions regarding eye drops or healing"
              className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 focus:outline-hidden focus:ring-1 focus:ring-[#1456f0]"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 flex items-center justify-between">
          <div className="text-xs text-slate-600 dark:text-slate-400">
            <span className="font-semibold text-slate-900 dark:text-white">
              {selectedDay.monthName} {selectedDay.dayNumber}
            </span>{" "}
            at {selectedSlot}
          </div>

          <button
            type="button"
            onClick={handleConfirm}
            className="cursor-pointer inline-flex items-center gap-2 px-5 py-2 rounded-xl bg-[#1456f0] hover:bg-blue-700 text-white text-xs font-semibold shadow-xs active:scale-95 transition-all"
          >
            <span>Confirm booking</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}
