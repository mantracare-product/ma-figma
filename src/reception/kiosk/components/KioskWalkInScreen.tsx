/**
 * KioskWalkInScreen.tsx
 * Path: src/reception/kiosk/components/KioskWalkInScreen.tsx
 *
 * Walk-in consultation queue joining flow:
 * - Select Specialty / Service
 * - Optional Doctor preference
 * - Default: Immediate queue entry (no slot picker needed)
 * - Optional: Slot selector for later time
 */

import React, { useState, useEffect } from "react";
import {
  UserPlus,
  ArrowRight,
  ArrowLeft,
  Stethoscope,
  Clock,
  Calendar,
  Sparkles,
  Zap,
  CheckCircle2,
} from "lucide-react";
import { toast } from "sonner";
import { getMaClient } from "../../lib/api/maClient";
import type { PatientSummary, ServiceItem, ProviderItem, QueueTicket, Journey, TimeSlot } from "../../types/reception";
import type { KioskLanguage } from "../i18n";
import { TRANSLATIONS } from "../i18n";

interface KioskWalkInScreenProps {
  language: KioskLanguage;
  patient: PatientSummary;
  sessionToken: string;
  onBack: () => void;
  onCheckinSuccess: (ticket: QueueTicket, journey: Journey) => void;
}

export const KioskWalkInScreen: React.FC<KioskWalkInScreenProps> = ({
  language,
  patient,
  sessionToken,
  onBack,
  onCheckinSuccess,
}) => {
  const t = TRANSLATIONS[language];
  const maClient = getMaClient();

  const [services, setServices] = useState<ServiceItem[]>([]);
  const [selectedServiceId, setSelectedServiceId] = useState<string>("");
  const [providers, setProviders] = useState<ProviderItem[]>([]);
  const [selectedProviderId, setSelectedProviderId] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Optional slot picking toggle
  const [showSlotPicker, setShowSlotPicker] = useState(false);
  const [slots, setSlots] = useState<TimeSlot[]>([]);
  const [selectedSlot, setSelectedSlot] = useState<string>("");

  useEffect(() => {
    const fetchServices = async () => {
      setLoading(true);
      try {
        const srvList = await maClient.getServices();
        setServices(srvList);
        if (srvList.length > 0) {
          setSelectedServiceId(srvList[0].id);
        }
        const provList = await maClient.getProviders();
        setProviders(provList);
      } catch (err) {
        toast.error("Failed to load services.");
      } finally {
        setLoading(false);
      }
    };
    fetchServices();
  }, []);

  // Fetch slots if slot picker is opened
  useEffect(() => {
    if (showSlotPicker && selectedServiceId) {
      const today = new Date().toISOString().split("T")[0];
      maClient.getSlots(selectedServiceId, today, selectedProviderId || undefined).then((res) => {
        setSlots(res);
        if (res.length > 0) setSelectedSlot(res[0].startTime || res[0].time || "");
      });
    }
  }, [showSlotPicker, selectedServiceId, selectedProviderId]);

  const handleJoinQueue = async () => {
    if (!selectedServiceId) {
      toast.error("Please select a service.");
      return;
    }

    setSubmitting(true);
    const idempotencyKey = `kiosk_walkin_${patient.id}_${Date.now()}`;
    try {
      if (showSlotPicker && selectedSlot) {
        // Book slot then check in
        const today = new Date().toISOString().split("T")[0];
        const apt = await maClient.bookAppointment(
          {
            clientId: patient.id,
            serviceId: selectedServiceId,
            providerId: selectedProviderId || undefined,
            date: today,
            time: selectedSlot,
          },
          sessionToken,
          idempotencyKey
        );
        const checkinRes = await maClient.checkinAppointment(apt.id, patient.id, sessionToken, `${idempotencyKey}_chk`);
        toast.success("Joined consultation queue!");
        onCheckinSuccess(checkinRes.ticket, checkinRes.journey);
      } else {
        // Default immediate walk-in
        const res = await maClient.checkinWalkIn({
          patient: {
            name: patient.name,
            phone: patient.phone,
          },
          reason: "Walk-in Consultation",
          idempotencyKey,
        });
        toast.success("Walk-in token issued!");
        onCheckinSuccess(res.ticket, res.journey);
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to join queue.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col items-center justify-center p-4 md:p-8 max-w-4xl mx-auto w-full select-none font-['Outfit']">
      {/* Top Navigation */}
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

      <div className="w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-3xl p-6 md:p-8 text-white shadow-2xl space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mx-auto text-emerald-400">
            <UserPlus className="w-7 h-7" />
          </div>
          <h3 className="text-2xl font-bold tracking-tight">Walk-in Consultation</h3>
          <p className="text-xs text-slate-400">
            Select specialty and join the queue for immediate token issuance.
          </p>
        </div>

        {loading ? (
          <div className="py-12 flex flex-col items-center justify-center text-slate-400 space-y-3">
            <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
            <p className="text-xs">Loading available clinical services...</p>
          </div>
        ) : (
          <div className="space-y-5">
            {/* 1. Service Selection */}
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-2 uppercase tracking-wider">
                {t.selectService}
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {services.map((srv) => {
                  const isSelected = selectedServiceId === srv.id;
                  return (
                    <button
                      key={srv.id}
                      type="button"
                      onClick={() => setSelectedServiceId(srv.id)}
                      className={`p-4 rounded-2xl border text-left transition-all flex items-start justify-between cursor-pointer ${
                        isSelected
                          ? "bg-emerald-500/10 border-emerald-500 shadow-md shadow-emerald-500/10 text-white"
                          : "bg-slate-800/60 border-slate-700/80 hover:bg-slate-800 text-slate-300"
                      }`}
                    >
                      <div className="space-y-1">
                        <h4 className="text-sm font-bold">{srv.name}</h4>
                        <p className="text-[11px] text-slate-400">
                          {srv.durationMin} mins • {srv.category || "General OPD"}
                        </p>
                      </div>
                      {isSelected && (
                        <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 2. Doctor Preference (Optional) */}
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-2 uppercase tracking-wider">
                {t.selectProvider}
              </label>
              <select
                value={selectedProviderId}
                onChange={(e) => setSelectedProviderId(e.target.value)}
                className="w-full px-4 py-3 bg-slate-950 border border-slate-700 rounded-2xl text-sm text-white focus:outline-none focus:border-emerald-500 cursor-pointer"
              >
                <option value="">Any Available Physician (Fastest)</option>
                {providers.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} ({p.specialization || p.specialty || "Physician"})
                  </option>
                ))}
              </select>
            </div>

            {/* 3. Immediate Queue Join Card (Default) */}
            <div className="p-4 bg-gradient-to-r from-emerald-950/40 to-slate-900 border border-emerald-500/30 rounded-2xl flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center flex-shrink-0">
                  <Zap className="w-5 h-5" />
                </div>
                <div>
                  <h5 className="text-sm font-bold text-emerald-300">{t.immediateQueueTitle}</h5>
                  <p className="text-xs text-slate-400">{t.immediateQueueDesc}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowSlotPicker(!showSlotPicker)}
                className="text-xs text-slate-400 hover:text-white underline cursor-pointer"
              >
                {showSlotPicker ? "Use Immediate Queue" : "Pick Time Slot"}
              </button>
            </div>

            {/* Optional Slot Picker */}
            {showSlotPicker && (
              <div className="p-4 bg-slate-950 rounded-2xl border border-slate-800 space-y-3">
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider">
                  Available Slots Today
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {slots.map((slot) => {
                    const timeLabel = slot.startTime || slot.time || "";
                    const isSelected = selectedSlot === timeLabel;
                    return (
                      <button
                        key={slot.id}
                        type="button"
                        onClick={() => setSelectedSlot(timeLabel)}
                        className={`py-2 px-3 rounded-xl border text-xs font-bold transition-all ${
                          isSelected
                            ? "bg-emerald-600 border-emerald-500 text-white"
                            : "bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700"
                        }`}
                      >
                        {timeLabel}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Submit Button */}
            <button
              type="button"
              disabled={submitting}
              onClick={handleJoinQueue}
              className="w-full py-4 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-2xl font-bold text-base transition-all shadow-lg shadow-emerald-600/30 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 active:scale-[0.99]"
            >
              {submitting ? "Issuing Token..." : t.joinQueueBtn}
              <ArrowRight className="w-5 h-5" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
