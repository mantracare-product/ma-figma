import React, { useState, useEffect } from "react";
import { useOutletContext, useNavigate, Link } from "react-router";
import {
  Calendar,
  Clock,
  User,
  CheckCircle2,
  AlertCircle,
  FileText,
  CreditCard,
  QrCode,
  MapPin,
  Sparkles,
  ArrowRight,
  Plus,
  Stethoscope,
  Pill,
  ExternalLink,
  ChevronRight,
  RefreshCw,
  Phone,
  Mail,
  ShieldCheck,
  Building,
} from "lucide-react";
import { Client, useClients } from "../../../lib/clientsStore";
import { appointmentService, Appointment } from "../../../lib/appointmentService";
import { invoiceService } from "../../../lib/invoiceService";
import { ClientInvoice } from "../../types/invoiceTypes";

interface PortalContext {
  activeClient: Client;
  onOpenDevSwitcher?: () => void;
}

export default function PatientStatusScreen() {
  const navigate = useNavigate();
  const context = useOutletContext<PortalContext>();
  const activeClient = context?.activeClient;
  const onOpenDevSwitcher = context?.onOpenDevSwitcher;

  // Real Appointments for this client from appointmentService
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  // Real Invoices for this client from invoiceService
  const [invoices, setInvoices] = useState<ClientInvoice[]>([]);
  const [showQrModal, setShowQrModal] = useState(false);

  useEffect(() => {
    if (!activeClient) return;

    const loadData = () => {
      // 1. Fetch live appointments from appointmentService
      const allAppts = appointmentService.getAppointments();
      const patientPhoneDigits = (activeClient.phone || "").replace(/\D/g, "");
      const patientNameLower = (activeClient.name || "").toLowerCase().trim();

      const clientAppts = allAppts.filter((a) => {
        if (a.clientId && String(a.clientId) === String(activeClient.id)) return true;
        const aPhoneDigits = (a.clientPhone || "").replace(/\D/g, "");
        if (patientPhoneDigits && aPhoneDigits && (patientPhoneDigits === aPhoneDigits || patientPhoneDigits.slice(-10) === aPhoneDigits.slice(-10))) {
          return true;
        }
        if (a.clientName && patientNameLower && a.clientName.toLowerCase().trim() === patientNameLower) {
          return true;
        }
        return false;
      });
      setAppointments(clientAppts);

      // 2. Fetch live invoices from invoiceService (synchronized with AI Receptionist & PatientBillScreen)
      const allInvoices = invoiceService.getInvoices();
      const clientInvoices = allInvoices.filter((inv) => {
        if (inv.clientId && String(inv.clientId) === String(activeClient.id)) return true;
        if (inv.clientName && patientNameLower && inv.clientName.toLowerCase().trim() === patientNameLower) return true;
        const invPhoneDigits = (inv.clientPhone || "").replace(/\D/g, "");
        if (patientPhoneDigits && invPhoneDigits && (patientPhoneDigits === invPhoneDigits || patientPhoneDigits.slice(-10) === invPhoneDigits.slice(-10))) {
          return true;
        }
        return false;
      });

      const matchedOrPending = clientInvoices.length > 0
        ? clientInvoices
        : allInvoices.filter((inv) => (inv.total - (inv.amountPaid || 0)) > 0 && inv.status !== "paid");

      setInvoices(matchedOrPending.length > 0 ? matchedOrPending : allInvoices);
    };

    loadData();

    window.addEventListener("mantra_appointments_changed", loadData);
    window.addEventListener("mantra_appointments_updated", loadData);
    window.addEventListener("mantra_invoices_changed", loadData);
    window.addEventListener("mantra_payments_changed", loadData);
    window.addEventListener("patient_portal_client_changed", loadData);
    window.addEventListener("storage", loadData);

    return () => {
      window.removeEventListener("mantra_appointments_changed", loadData);
      window.removeEventListener("mantra_appointments_updated", loadData);
      window.removeEventListener("mantra_invoices_changed", loadData);
      window.removeEventListener("mantra_payments_changed", loadData);
      window.removeEventListener("patient_portal_client_changed", loadData);
      window.removeEventListener("storage", loadData);
    };
  }, [activeClient]);

  if (!activeClient) {
    return (
      <div className="max-w-xl mx-auto py-16 text-center space-y-4">
        <User className="w-12 h-12 text-slate-300 mx-auto" />
        <h2 className="text-xl font-bold text-slate-800">No Patient Profile Active</h2>
        <p className="text-sm text-slate-500">Please sign in or select a patient to continue.</p>
        <Link
          to="/patient/login"
          className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white font-semibold text-sm rounded-xl"
        >
          <span>Go to Sign In</span>
          <ArrowRight className="w-4 h-4" />
        </Link>
      </div>
    );
  }

  // Calculate stats
  const scheduledCount = appointments.filter((a) => a.status === "scheduled" || a.status === "pending-accept").length;
  const pendingInvoices = invoices.filter((i) => i.status !== "paid" && i.status !== "void");
  const totalBalanceDue = pendingInvoices.reduce((sum, inv) => sum + (inv.total || inv.subtotal || 0), 0);

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-12">
      {/* ── Metric Snapshot Cards ── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block" style={{ fontFamily: "Outfit, sans-serif" }}>
              Active Appointments
            </span>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold text-slate-900" style={{ fontFamily: "DM Sans, sans-serif" }}>
                {scheduledCount}
              </span>
              <span className="text-xs text-slate-500 font-medium">scheduled</span>
            </div>
          </div>
          <div className="w-12 h-12 rounded-xl bg-blue-50 border border-blue-100 text-blue-600 flex items-center justify-center">
            <Calendar className="w-6 h-6 text-blue-600" />
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block" style={{ fontFamily: "Outfit, sans-serif" }}>
              Pending Invoices
            </span>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold text-slate-900" style={{ fontFamily: "DM Sans, sans-serif" }}>
                {pendingInvoices.length}
              </span>
              <span className="text-xs text-slate-500 font-medium">unpaid</span>
            </div>
          </div>
          <div className="w-12 h-12 rounded-xl bg-amber-50 border border-amber-100 text-amber-600 flex items-center justify-center">
            <CreditCard className="w-6 h-6 text-amber-600" />
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block" style={{ fontFamily: "Outfit, sans-serif" }}>
              Clinic Status
            </span>
            <div className="flex items-center gap-1.5 mt-1">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-sm font-bold text-emerald-700" style={{ fontFamily: "DM Sans, sans-serif" }}>
                Connected Live
              </span>
            </div>
          </div>
          <div className="w-12 h-12 rounded-xl bg-emerald-50 border border-emerald-100 text-emerald-600 flex items-center justify-center">
            <ShieldCheck className="w-6 h-6 text-emerald-600" />
          </div>
        </div>
      </div>

      {/* ── Main Content Grid: Appointments & Invoices ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column (8 cols): Appointments List */}
        <div className="lg:col-span-8 space-y-4">
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                  <Calendar className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-slate-900" style={{ fontFamily: "DM Sans, sans-serif" }}>
                    My Clinic Appointments
                  </h2>
                  <p className="text-xs text-slate-500" style={{ fontFamily: "Outfit, sans-serif" }}>
                    Live appointments synchronized with Mantra Assist
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => navigate("/patient/book")}
                className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1 shadow-2xs cursor-pointer"
                style={{ fontFamily: "Outfit, sans-serif" }}
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Book Slot</span>
              </button>
            </div>

            <div className="p-5">
              {appointments.length === 0 ? (
                <div className="text-center py-12 space-y-3">
                  <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-500 flex items-center justify-center mx-auto border border-blue-100">
                    <Calendar className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-800">No Appointments Scheduled</h3>
                    <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                      You do not have any active appointments yet. Book a consultation with our doctors to begin.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => navigate("/patient/book")}
                    className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Book Your First Appointment</span>
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  {appointments.map((apt) => {
                    const isUpcoming = apt.status === "scheduled" || apt.status === "pending-accept";
                    return (
                      <div
                        key={apt.id}
                        className="p-4 rounded-xl border border-slate-200/90 hover:border-blue-300 hover:bg-slate-50/50 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4 group"
                      >
                        <div className="flex items-start gap-3.5">
                          <div className="w-11 h-11 rounded-xl bg-blue-50 border border-blue-100 text-blue-600 flex flex-col items-center justify-center shrink-0">
                            <span className="text-[10px] font-bold uppercase leading-none text-blue-700">
                              {apt.date ? new Date(apt.date).toLocaleDateString("en-US", { month: "short" }) : "APR"}
                            </span>
                            <span className="text-sm font-bold leading-none mt-0.5 text-blue-900 font-mono">
                              {apt.date ? new Date(apt.date).getDate() : "12"}
                            </span>
                          </div>

                          <div className="space-y-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <h3 className="text-sm font-bold text-slate-900 group-hover:text-blue-600 transition-colors" style={{ fontFamily: "DM Sans, sans-serif" }}>
                                {apt.title || apt.serviceName || "Clinical Consultation"}
                              </h3>

                              {/* Source Badge */}
                              {apt.source && (
                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                                  apt.source.toLowerCase().includes("walk")
                                    ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                    : apt.source.toLowerCase().includes("ma-client")
                                    ? "bg-indigo-50 text-indigo-700 border-indigo-200"
                                    : "bg-sky-50 text-sky-700 border-sky-200"
                                }`}>
                                  Source: {apt.source}
                                </span>
                              )}

                              {/* Status Badge */}
                              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                                apt.status === "completed"
                                  ? "bg-slate-100 text-slate-700"
                                  : apt.status === "cancelled"
                                  ? "bg-red-50 text-red-700 border border-red-200"
                                  : "bg-emerald-50 text-emerald-700 border border-emerald-200"
                              }`}>
                                {apt.status}
                              </span>
                            </div>

                            <div className="flex flex-wrap items-center gap-x-4 text-xs text-slate-500 font-medium" style={{ fontFamily: "Outfit, sans-serif" }}>
                              <span className="flex items-center gap-1">
                                <Clock className="w-3.5 h-3.5 text-slate-400" />
                                {apt.time || "10:00 AM"} ({apt.duration || 30} mins)
                              </span>
                              <span className="flex items-center gap-1">
                                <Stethoscope className="w-3.5 h-3.5 text-slate-400" />
                                {apt.employeeName || "Assigned Physician"}
                              </span>
                              {apt.location && (
                                <span className="flex items-center gap-1">
                                  <MapPin className="w-3.5 h-3.5 text-slate-400" />
                                  {apt.location}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Right Quick Actions */}
                        <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                          {isUpcoming && (
                            <button
                              type="button"
                              onClick={() => setShowQrModal(true)}
                              className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-700 flex items-center gap-1 cursor-pointer transition-colors"
                            >
                              <QrCode className="w-3.5 h-3.5 text-blue-600" />
                              <span>Check-In Pass</span>
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Column (4 cols): Billing & Invoices */}
        <div className="lg:col-span-4 space-y-4">
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CreditCard className="w-4 h-4 text-slate-600" />
                <h3 className="text-sm font-bold text-slate-900" style={{ fontFamily: "DM Sans, sans-serif" }}>
                  Bills & Invoices
                </h3>
              </div>
              <span className="text-xs font-bold text-slate-500 font-mono">
                {invoices.length} total
              </span>
            </div>

            <div className="p-5 space-y-3">
              {invoices.length === 0 ? (
                <div className="text-center py-8 space-y-2">
                  <div className="w-10 h-10 rounded-xl bg-slate-50 text-slate-400 flex items-center justify-center mx-auto">
                    <FileText className="w-5 h-5" />
                  </div>
                  <p className="text-xs font-semibold text-slate-600">No Invoices on File</p>
                  <p className="text-[11px] text-slate-400">
                    Clinical bills generated during or after your appointment will appear here.
                  </p>
                </div>
              ) : (
                <div className="space-y-2.5">
                  {invoices.map((inv) => {
                    const isPaid = inv.status === "paid";
                    return (
                      <div
                        key={inv.id}
                        className="p-3.5 rounded-xl border border-slate-200/80 hover:border-blue-200 bg-slate-50/50 flex items-center justify-between gap-3"
                      >
                        <div className="min-w-0 space-y-0.5">
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs font-bold text-slate-900 font-mono truncate">
                              #{inv.invoiceNumber || inv.id}
                            </span>
                            <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded uppercase ${
                              isPaid
                                ? "bg-emerald-100 text-emerald-800"
                                : "bg-amber-100 text-amber-800"
                            }`}>
                              {inv.status}
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-500">
                            {inv.createdAt || inv.dueDate || "Recent"}
                          </p>
                        </div>

                        <div className="text-right shrink-0">
                          <span className="text-sm font-bold text-slate-900 font-mono block">
                            ${inv.total || inv.subtotal || 150}
                          </span>
                          {!isPaid ? (
                            <button
                              type="button"
                              onClick={() => navigate("/patient/bill")}
                              className="text-[11px] font-bold text-blue-600 hover:underline mt-0.5"
                            >
                              Pay Now →
                            </button>
                          ) : (
                            <span className="text-[10px] text-emerald-600 font-semibold flex items-center justify-end gap-0.5">
                              <CheckCircle2 className="w-3 h-3" /> Paid
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Quick Help Card */}
          <div className="p-5 rounded-2xl bg-gradient-to-r from-blue-50/80 to-indigo-50/80 border border-blue-200/80 space-y-2.5">
            <div className="flex items-center gap-2 text-blue-900 font-bold text-xs" style={{ fontFamily: "DM Sans, sans-serif" }}>
              <Sparkles className="w-4 h-4 text-blue-600" />
              <span>Patient Assistance</span>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed font-['Outfit']">
              Need assistance with your booking or prescription? You can reach our front desk kiosk or book with your doctor directly online.
            </p>
            <div className="flex items-center gap-2 pt-1">
              <button
                type="button"
                onClick={() => navigate("/reception")}
                className="text-xs font-bold text-blue-700 hover:text-blue-900 flex items-center gap-1 cursor-pointer"
              >
                <span>AI Receptionist Kiosk</span>
                <ExternalLink className="w-3 h-3" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ── QR Check-In Pass Modal ── */}
      {showQrModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-sm w-full shadow-2xl text-center space-y-5 animate-in zoom-in-95 duration-150">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-blue-600 bg-blue-50 border border-blue-200 px-3 py-1 rounded-full">
                Digital Kiosk Pass
              </span>
              <h3 className="text-xl font-bold text-slate-900 mt-2" style={{ fontFamily: "DM Sans, sans-serif" }}>
                {activeClient.name}
              </h3>
              <p className="text-xs text-slate-500 font-mono mt-0.5">
                Patient #{activeClient.id}
              </p>
            </div>

            {/* QR Code Graphic */}
            <div className="w-48 h-48 mx-auto p-3 bg-white border-2 border-slate-200 rounded-2xl shadow-sm flex items-center justify-center">
              <QrCode className="w-36 h-36 text-slate-900" />
            </div>

            <p className="text-xs text-slate-500 max-w-xs mx-auto leading-relaxed" style={{ fontFamily: "Outfit, sans-serif" }}>
              Scan this QR code at the AI Receptionist kiosk at the clinic entrance to verify identity and check in automatically.
            </p>

            <button
              type="button"
              onClick={() => setShowQrModal(false)}
              className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl transition-colors cursor-pointer"
            >
              Done
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
