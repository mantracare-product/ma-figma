import React, { useState, useEffect } from "react";
import { Calendar, Clock, Video, Sparkles, X, Copy, ExternalLink } from "lucide-react";
import { motion } from "motion/react";
import { toast } from "sonner";
import { Appointment, generateTeleconsultMeeting } from "../../../lib/appointmentService";

export interface JoinTeleconsultModalProps {
  appointment: Partial<Appointment> | null;
  onClose: () => void;
  onConfirmJoin?: (appointment: Partial<Appointment>, withAiScribe: boolean) => void;
  zIndex?: number;
}

/**
 * Confirmation modal shown before joining a Google Meet teleconsultation.
 * Prompts the clinician to toggle AI Scribe on/off (inspired by Partner Dashboard Sessions modal).
 */
export default function JoinTeleconsultModal({
  appointment,
  onClose,
  onConfirmJoin,
  zIndex = 750,
}: JoinTeleconsultModalProps) {
  const [aiScribeEnabled, setAiScribeEnabled] = useState(true);

  useEffect(() => {
    if (appointment) {
      setAiScribeEnabled(true);
    }
  }, [appointment?.id]);

  if (!appointment) return null;

  const meetUrl =
    appointment.meetingUrl ||
    generateTeleconsultMeeting("google_meet", appointment.id).meetingUrl;

  const formattedDate = (() => {
    if (!appointment.date) return "Today";
    try {
      const d = new Date(appointment.date.includes("T") ? appointment.date : `${appointment.date}T00:00:00`);
      if (!isNaN(d.getTime())) {
        return d.toLocaleDateString("en-US", {
          weekday: "short",
          month: "short",
          day: "numeric",
          year: "numeric",
        });
      }
    } catch {
      // ignore
    }
    return appointment.date;
  })();

  const initials = (appointment.clientName || "CL")
    .split(" ")
    .map((p) => p[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  const handleJoin = () => {
    if (meetUrl) {
      window.open(meetUrl, "_blank", "noopener,noreferrer");
    }
    const target = appointment;
    onClose();
    onConfirmJoin?.(target, aiScribeEnabled);
  };

  return (
    <div
      className="fixed inset-0 flex items-center justify-center p-4"
      style={{ zIndex }}
      onClick={onClose}
    >
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="absolute inset-0 bg-black/55 backdrop-blur-xs"
      />

      {/* Modal Card (inspired by Partner-Dashboard Sessions modal) */}
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 8 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 8 }}
        transition={{ duration: 0.16 }}
        onClick={(e) => e.stopPropagation()}
        className="relative bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden z-10 border border-slate-200/80"
      >
        {/* Header Gradient Banner */}
        <div className="h-24 bg-gradient-to-r from-[#2563EB] via-[#3b82f6] to-[#4F46E5] relative flex justify-end p-4">
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 text-white flex items-center justify-center transition-colors backdrop-blur-xs cursor-pointer"
            aria-label="Close modal"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Overlapping Avatar & Client Info */}
        <div className="relative text-center px-6 -mt-10 pb-3">
          <div className="inline-block relative">
            <div
              className="w-20 h-20 rounded-full bg-slate-900 text-white font-bold text-xl flex items-center justify-center border-4 border-white shadow-md"
              style={{ fontFamily: "Outfit, sans-serif" }}
            >
              {initials}
            </div>
            <div className="absolute bottom-0 right-0 w-7 h-7 bg-[#2563EB] rounded-full flex items-center justify-center border-2 border-white text-white shadow-sm">
              <Video className="w-3.5 h-3.5" />
            </div>
          </div>

          <h2 className="text-lg font-bold text-slate-900 mt-2" style={{ fontFamily: "Outfit, sans-serif" }}>
            {appointment.clientName || "Patient"}
          </h2>
          <p className="text-xs font-semibold text-[#2563EB] mt-0.5">
            {appointment.serviceName || appointment.title || "Teleconsultation Session"}
          </p>
        </div>

        {/* Body Content */}
        <div className="px-6 pb-6 space-y-3.5">
          {/* Date, Time & Meet Link Container */}
          <div className="bg-slate-50 rounded-2xl p-3.5 space-y-2.5 border border-slate-100">
            <div className="flex items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-2 text-slate-700 font-medium">
                <Calendar className="w-3.5 h-3.5 text-[#2563EB] shrink-0" />
                <span>{formattedDate}</span>
              </div>
              <div className="flex items-center gap-1.5 text-slate-700 font-medium">
                <Clock className="w-3.5 h-3.5 text-[#2563EB] shrink-0" />
                <span>{appointment.time || "Scheduled"}</span>
              </div>
            </div>

            <div className="pt-2 border-t border-slate-200/70 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <Video className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                <span className="text-[11px] font-mono text-slate-600 truncate">{meetUrl}</span>
              </div>
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard?.writeText(meetUrl);
                  toast.success("Google Meet link copied");
                }}
                className="p-1.5 rounded-lg bg-white border border-slate-200 text-slate-500 hover:text-slate-900 cursor-pointer shrink-0"
                title="Copy Meet link"
              >
                <Copy className="w-3 h-3" />
              </button>
            </div>
          </div>

          {/* AI Scribe Toggle Card (inspired by Partner-Dashboard AI Notetaker card) */}
          <div
            onClick={() => setAiScribeEnabled((v) => !v)}
            className={`cursor-pointer rounded-2xl p-3.5 border transition-all ${
              aiScribeEnabled
                ? "bg-indigo-50/60 border-indigo-200 shadow-2xs"
                : "bg-slate-50 border-slate-200 hover:border-slate-300"
            }`}
          >
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <div
                  className={`w-9 h-9 rounded-xl flex items-center justify-center transition-colors shrink-0 ${
                    aiScribeEnabled ? "bg-[#4F46E5] text-white" : "bg-slate-200 text-slate-500"
                  }`}
                >
                  <Sparkles className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <span className="text-xs font-bold text-slate-900 block">
                    AI Scribe
                  </span>
                  <p className="text-[11px] text-slate-500 mt-0.5 truncate">
                    {aiScribeEnabled
                      ? "Auto-transcribe & draft clinical note for this call"
                      : "Click to enable AI Scribe during session"}
                  </p>
                </div>
              </div>

              <div
                className={`w-10 h-5 rounded-full p-0.5 transition-colors flex items-center shrink-0 ${
                  aiScribeEnabled ? "bg-[#4F46E5] justify-end" : "bg-slate-300 justify-start"
                }`}
              >
                <span className="w-4 h-4 rounded-full bg-white shadow-xs block" />
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-2.5 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleJoin}
              className="flex-1 py-2.5 px-4 bg-[#2563EB] hover:bg-[#1d4ed8] text-white rounded-xl text-xs font-bold shadow-sm hover:shadow transition-all cursor-pointer flex items-center justify-center gap-1.5"
            >
              <Video className="w-3.5 h-3.5" />
              <span>Join Google Meet</span>
              <ExternalLink className="w-3 h-3 opacity-80" />
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
