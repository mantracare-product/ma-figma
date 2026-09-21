/**
 * KioskAppointmentMatchScreen.tsx
 * Path: src/reception/kiosk/components/KioskAppointmentMatchScreen.tsx
 *
 * Displays today's scheduled appointments for the identified patient:
 * - 1-tap instant check-in
 * - Early arrival badge & rules
 * - Fallback to walk-in queue if no appointment scheduled
 */

import React, { useState, useEffect } from "react";
import {
  CalendarCheck,
  Clock,
  User,
  MapPin,
  ArrowRight,
  ArrowLeft,
  Sparkles,
  AlertCircle,
  CheckCircle2,
  UserPlus,
} from "lucide-react";
import { toast } from "sonner";
import { getMaClient } from "../../lib/api/maClient";
import type { PatientSummary, AppointmentSummary, QueueTicket, Journey } from "../../types/reception";
import type { KioskLanguage } from "../i18n";
import { TRANSLATIONS } from "../i18n";

interface KioskAppointmentMatchScreenProps {
  language: KioskLanguage;
  patient: PatientSummary;
  sessionToken: string;
  onBack: () => void;
  onCheckinSuccess: (ticket: QueueTicket, journey: Journey) => void;
  onSwitchToWalkin: () => void;
}

export const KioskAppointmentMatchScreen: React.FC<KioskAppointmentMatchScreenProps> = ({
  language,
  patient,
  sessionToken,
  onBack,
  onCheckinSuccess,
  onSwitchToWalkin,
}) => {
  const t = TRANSLATIONS[language];
  const maClient = getMaClient();

  const [appointments, setAppointments] = useState<AppointmentSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [checkingInId, setCheckingInId] = useState<string | null>(null);

  useEffect(() => {
    const fetchAppointments = async () => {
      setLoading(true);
      try {
        const list = await maClient.getTodayAppointments(patient.id, sessionToken);
        setAppointments(list);
      } catch (err: any) {
        toast.error("Failed to load appointments.");
      } finally {
        setLoading(false);
      }
    };
    fetchAppointments();
  }, [patient.id, sessionToken]);

  const handleConfirmCheckin = async (apt: AppointmentSummary) => {
    setCheckingInId(apt.id);
    const idempotencyKey = `kiosk_chk_${apt.id}_${Date.now()}`;
    try {
      const res = await maClient.checkinAppointment(apt.id, patient.id, sessionToken, idempotencyKey);
      toast.success("Check-in confirmed!");
      onCheckinSuccess(res.ticket, res.journey);
    } catch (err: any) {
      toast.error(err.message || "Failed to confirm check-in.");
    } finally {
      setCheckingInId(null);
    }
  };

  return (
    <div className="flex-1 flex flex-col items-center justify-center p-4 md:p-8 max-w-4xl mx-auto w-full select-none font-['Outfit']">
      {/* Top Bar */}
      <div className="w-full flex items-center justify-between mb-6">
        <button
          type="button"
          onClick={onBack}
          className="px-4 py-2.5 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-300 flex items-center gap-2 text-xs font-bold transition-all cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          {t.backBtn}
        </button>

        <div className="flex items-center gap-2 text-xs font-semibold text-slate-400">
          <span>Patient:</span>
          <span className="text-white font-bold">{patient.name}</span>
        </div>
      </div>

      <div className="w-full max-w-xl bg-slate-900 border border-slate-800 rounded-3xl p-6 md:p-8 text-white shadow-2xl space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="w-14 h-14 rounded-2xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center mx-auto text-blue-400">
            <CalendarCheck className="w-7 h-7" />
          </div>
          <h3 className="text-2xl font-bold tracking-tight">{t.todayAppointments}</h3>
          <p className="text-xs text-slate-400">
            Verified appointments for today for <span className="font-bold text-white">{patient.name}</span>
          </p>
        </div>

        {loading ? (
          <div className="py-12 flex flex-col items-center justify-center text-slate-400 space-y-3">
            <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
            <p className="text-xs">Searching today's schedule...</p>
          </div>
        ) : appointments.length > 0 ? (
          <div className="space-y-4">
            {appointments.map((apt) => (
              <div
                key={apt.id}
                className="p-5 bg-gradient-to-b from-slate-800/90 to-slate-850 border border-slate-700 rounded-2xl space-y-4 shadow-lg"
              >
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-blue-500/20 text-blue-400 border border-blue-500/30">
                      <Clock className="w-3 h-3" />
                      {apt.time} Today
                    </span>
                    <h4 className="text-lg font-bold text-white pt-1">
                      {apt.serviceName}
                    </h4>
                    <p className="text-xs text-slate-400 flex items-center gap-1.5">
                      <User className="w-3.5 h-3.5 text-slate-500" />
                      {apt.providerName || "Assigned Doctor"}
                    </p>
                  </div>
                  <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-1 bg-emerald-500/10 text-emerald-400 rounded-lg border border-emerald-500/20">
                    Confirmed
                  </span>
                </div>

                <button
                  type="button"
                  disabled={checkingInId === apt.id}
                  onClick={() => handleConfirmCheckin(apt)}
                  className="w-full py-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-2xl font-bold text-sm transition-all shadow-lg shadow-blue-600/30 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 active:scale-[0.99]"
                >
                  {checkingInId === apt.id ? "Checking in..." : t.confirmCheckin}
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        ) : (
          /* Empty / No appointments found */
          <div className="py-8 text-center space-y-5">
            <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center mx-auto text-amber-400">
              <AlertCircle className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <p className="text-base font-bold text-slate-200">{t.noAppointmentFound}</p>
              <p className="text-xs text-slate-400 max-w-sm mx-auto">
                No prior scheduled booking found for this profile today. You can join the immediate walk-in consultation queue.
              </p>
            </div>

            <button
              type="button"
              onClick={onSwitchToWalkin}
              className="w-full py-4 bg-emerald-600 hover:bg-emerald-500 text-white rounded-2xl font-bold text-sm transition-all shadow-lg shadow-emerald-600/30 flex items-center justify-center gap-2 cursor-pointer"
            >
              <UserPlus className="w-4 h-4" />
              {t.proceedAsWalkin}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
