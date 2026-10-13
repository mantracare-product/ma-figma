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
  ExternalLink,
  ChevronRight,
  ShieldCheck,
  Activity,
  Radio,
  X,
  Layers,
  Info,
  Receipt,
  Building2,
} from "lucide-react";
import { Client, moveClientToStage } from "../../../lib/clientsStore";
import { appointmentService, Appointment } from "../../../lib/appointmentService";
import { invoiceService } from "../../../lib/invoiceService";
import { ClientInvoice } from "../../types/invoiceTypes";
import {
  getStoredProcesses,
  Stage,
  isStageEnabledForPortal,
} from "../../../lib/useProcessStore";
import { useOrganization } from "../../context/OrganizationContext";
import { findRoomForAppointment } from "../../../lib/roomsStore";

interface PortalContext {
  activeClient: Client;
  onOpenDevSwitcher?: () => void;
}

export default function PatientStatusScreen() {
  const navigate = useNavigate();
  const context = useOutletContext<PortalContext>();
  const activeClient = context?.activeClient;

  // Real Appointments for this client from appointmentService
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  // Real Invoices for this client from invoiceService
  const [invoices, setInvoices] = useState<ClientInvoice[]>([]);
  const [showQrModal, setShowQrModal] = useState(false);

  // Stage Detail Drawer in Client Portal
  const [selectedStageForDrawer, setSelectedStageForDrawer] = useState<Stage | null>(null);

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

      // 2. Fetch live invoices from invoiceService
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

  // Retrieve current active process assigned to this client
  const allProcesses = getStoredProcesses();
  const activeProcess =
    allProcesses.find(
      (p) =>
        activeClient.processes?.some((pNameOrId) => pNameOrId === p.name || pNameOrId === p.id)
    ) ||
    allProcesses.find((p) => p.name === "Patient Care Journey" || p.id === "demo-patient-care-journey");

  const allStages = activeProcess?.stages || [];
  const rawStageName = activeClient.stage;
  const currentStageIndex = rawStageName
    ? allStages.findIndex(
        (s) =>
          s.name.toLowerCase() === rawStageName.toLowerCase() ||
          s.id.toLowerCase() === rawStageName.toLowerCase()
      )
    : -1;

  // Determine hospital check-in state:
  // True if assigned to a valid process stage (not Confirmed/Unregistered), OR client status is Checked In,
  // OR client has checkedInAt timestamp, OR any appointment is checked-in.
  const hasCheckedInAppt = appointments.some(
    (a) =>
      (String(a.clientId) === String(activeClient.id) || a.clientName === activeClient.name) &&
      (a.status === "checked-in" || Boolean(a.checkedInAt))
  );

  const isCheckedIn = Boolean(
    activeProcess &&
    (
      (currentStageIndex >= 0 && rawStageName && !["Unregistered", "Confirmed", "Not Assigned"].includes(rawStageName)) ||
      activeClient.status === "Checked In" ||
      Boolean((activeClient as any).checkedInAt) ||
      hasCheckedInAppt
    )
  );

  // Auto-heal stage if checked in but stage is still "Confirmed" / "Unregistered"
  useEffect(() => {
    if (
      isCheckedIn &&
      activeClient &&
      (!activeClient.stage || ["Confirmed", "Unregistered", "Not Assigned"].includes(activeClient.stage))
    ) {
      moveClientToStage(activeClient.id, "Client Checked In", activeProcess?.name || "Patient Care Journey");
    }
  }, [isCheckedIn, activeClient?.id, activeClient?.stage, activeProcess?.name]);

  const currentStageName =
    activeClient.stage && !["Confirmed", "Unregistered", "Not Assigned"].includes(activeClient.stage)
      ? activeClient.stage
      : isCheckedIn
      ? allStages[0]?.name || "Client Checked In"
      : activeClient.stage;

  const isAssignedToStage = currentStageIndex >= 0 || isCheckedIn;
  const activeIdx = currentStageIndex >= 0 ? currentStageIndex : isCheckedIn ? 0 : -1;

  // Filter only stages where toggle is enabled AND configuration is done
  const portalEnabledStages = activeProcess ? allStages.filter((st) => isStageEnabledForPortal(st)) : [];

  // Primary upcoming appointment
  const primaryAppt = appointments.find((a) => a.status === "scheduled" || a.status === "pending-accept") || appointments[0];
  const primaryInvoice = invoices.find((i) => i.status !== "paid") || invoices[0];

  // Substitute variables inside drawer HTML content
  const renderDrawerHtml = (stage: Stage) => {
    const rawHtml =
      stage.portalReceptionSettings?.htmlContent ||
      stage.portalReceptionSettings?.text ||
      `<div class="stage-guide"><h3>${stage.portalReceptionSettings?.cardTitle || stage.name}</h3><p>${stage.description}</p></div>`;

    const sampleValues: Record<string, string> = {
      "client.name": activeClient.name || "Patient",
      "client.firstName": (activeClient.name || "Patient").split(" ")[0],
      "client.lastName": (activeClient.name || "").split(" ").slice(1).join(" ") || "",
      "client.phone": activeClient.phone || "+1 (555) 000-0000",
      "client.email": activeClient.email || "patient@example.com",
      "client.id": activeClient.id || "CL-032",
      "appointment.date": primaryAppt?.date ? new Date(primaryAppt.date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "Today",
      "appointment.time": primaryAppt?.time || "11:30 AM",
      "appointment.service": primaryAppt?.title || primaryAppt?.serviceName || "Clinical Consultation",
      "appointment.provider": primaryAppt?.employeeName || "Dr. Rajesh Patel",
      "appointment.room": primaryAppt?.location || "Consultation Room 3",
      "invoice.id": primaryInvoice?.invoiceNumber || "INV-CL-1056",
      "invoice.total": primaryInvoice ? `$${primaryInvoice.total.toFixed(2)}` : "$78.75",
      "invoice.balanceDue": primaryInvoice ? `$${(primaryInvoice.total - (primaryInvoice.amountPaid || 0)).toFixed(2)}` : "$78.75",
      "invoice.status": primaryInvoice?.status || "Pending",
      "stage.name": stage.name,
      "process.name": activeProcess?.name || "Patient Care Journey",
      "clinic.name": "Mantra Clinic & Wellness Center",
    };

    let rendered = rawHtml;
    Object.entries(sampleValues).forEach(([key, val]) => {
      rendered = rendered.split(`{{${key}}}`).join(val);
      rendered = rendered.split(`{${key}}`).join(val);
    });

    return rendered;
  };

  const { activeOrganization } = useOrganization();
  const orgName = activeOrganization?.name || "Mantra Health & Wellness";
  const clientFirstName = (activeClient.name || "Patient").split(" ")[0];

  // ── Today's Appointment & Invoice Matching Logic ──
  const now = new Date();
  const todayIso = now.toISOString().split("T")[0];
  const localToday = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;

  const todayAppts = appointments.filter((a) => {
    if (!a.date) return false;
    const d = a.date.split("T")[0];
    return d === todayIso || d === localToday;
  });

  const todayAppt =
    todayAppts.find((a) => a.status !== "completed" && a.status !== "cancelled") ||
    todayAppts.find((a) => a.status === "completed") ||
    todayAppts[0] ||
    null;

  const isTodayApptCompleted = todayAppt ? todayAppt.status === "completed" : false;

  const matchedInvoice = isTodayApptCompleted
    ? (todayAppt?.invoiceId
        ? invoices.find((inv) => String(inv.id) === String(todayAppt.invoiceId) || inv.invoiceNumber === todayAppt.invoiceId)
        : null) ||
      invoices.find((inv) => String(inv.appointmentId) === String(todayAppt?.id)) ||
      invoices[0] ||
      null
    : null;

  const allocatedRoom = todayAppt
    ? findRoomForAppointment({
        serviceName: todayAppt.serviceName || todayAppt.title,
        location: todayAppt.location,
        employeeName: todayAppt.employeeName,
        employeeId: todayAppt.employeeId,
      })
    : null;
  const roomDisplay = todayAppt?.roomNumber
    ? `Room ${todayAppt.roomNumber}`
    : allocatedRoom
    ? `Room ${allocatedRoom.roomNumber}`
    : null;
  const roomDirection = allocatedRoom?.direction;

  // Format dynamic time for activity timeline steps
  const getStageTime = (rawIndex: number, currentActiveIndex: number, appt: Appointment | null) => {
    const baseTimeStr = appt?.time || "10:30 AM";
    let baseHours = 10;
    let baseMinutes = 30;
    try {
      const clean = baseTimeStr.replace(".", ":");
      const parts = clean.split(":");
      if (parts.length >= 2) {
        const h = parseInt(parts[0], 10);
        const m = parseInt(parts[1], 10);
        if (!isNaN(h)) baseHours = h;
        if (!isNaN(m)) baseMinutes = m;
        if (clean.toLowerCase().includes("pm") && baseHours < 12) baseHours += 12;
        if (clean.toLowerCase().includes("am") && baseHours === 12) baseHours = 0;
      }
    } catch {}

    const stepDiff = rawIndex - (currentActiveIndex >= 0 ? currentActiveIndex : 0);
    const offsetMinutes = stepDiff * 20;

    const d = new Date();
    d.setHours(baseHours, baseMinutes + offsetMinutes, 0, 0);

    const hours = d.getHours();
    const minutes = d.getMinutes();
    const ampm = hours >= 12 ? "PM" : "AM";
    const displayHours = hours % 12 || 12;
    const displayMinutes = minutes < 10 ? `0${minutes}` : minutes;

    return `${displayHours}:${displayMinutes} ${ampm}`;
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-16 px-3 sm:px-6">
      {/* ── 1. WELCOME TO ORGANIZATION BANNER ── */}
      <div className="relative overflow-hidden rounded-3xl bg-[#1E293B] text-white p-6 sm:p-8 shadow-sm border border-slate-800/80">
        <div className="absolute -top-12 -right-12 w-48 h-48 bg-white/5 rounded-full blur-2xl pointer-events-none" />
        <div className="absolute -bottom-10 -left-10 w-44 h-44 bg-blue-500/10 rounded-full blur-xl pointer-events-none" />

        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1.5 max-w-xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md border border-white/15 text-white text-xs font-semibold">
              <Sparkles className="w-3.5 h-3.5 text-blue-300" />
              <span>{orgName}</span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white" style={{ fontFamily: "DM Sans, sans-serif" }}>
              Welcome to {orgName}, {clientFirstName}!
            </h1>

            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed" style={{ fontFamily: "Outfit, sans-serif" }}>
              Your dedicated patient portal for appointments, clinic guidance, and instant digital billing.
            </p>
          </div>

          <div className="flex flex-col sm:items-end gap-2 shrink-0">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-2xl bg-white/10 backdrop-blur-md border border-white/15 text-xs font-semibold text-slate-200">
              <Calendar className="w-3.5 h-3.5 text-slate-300" />
              <span>
                {new Date().toLocaleDateString("en-US", {
                  weekday: "short",
                  month: "short",
                  day: "numeric",
                })}
              </span>
            </div>
            {isCheckedIn && (
              <span className="inline-flex items-center gap-1.5 text-[11px] font-bold text-emerald-300 bg-emerald-950/60 px-2.5 py-1 rounded-full border border-emerald-500/30">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span>Checked In at Clinic</span>
              </span>
            )}
          </div>
        </div>
      </div>

      {/* ── 2. TODAY'S APPOINTMENT OR INVOICE CARD ── */}
      {isTodayApptCompleted ? (
        /* REPLACED WITH INVOICE CARD WHEN APPOINTMENT IS COMPLETED */
        <div className="bg-white rounded-3xl border border-slate-200/90 p-5 sm:p-6 shadow-xs transition-all hover:border-slate-300">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                <span>Appointment Completed • Invoice Generated</span>
              </span>
            </div>

            <span
              className={`text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider self-start sm:self-center ${
                matchedInvoice?.status === "paid"
                  ? "bg-emerald-100 text-emerald-800 border border-emerald-200"
                  : "bg-amber-100 text-amber-800 border border-amber-200"
              }`}
            >
              {matchedInvoice?.status === "paid" ? "Paid" : "Payment Pending"}
            </span>
          </div>

          <div className="pt-4 flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-1.5">
              <div className="flex items-center gap-2">
                <Receipt className="w-4 h-4 text-blue-600" />
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                  Invoice #{matchedInvoice?.invoiceNumber || matchedInvoice?.id || "INV-CL-1052"}
                </span>
              </div>
              <h3 className="text-base sm:text-lg font-bold text-slate-900" style={{ fontFamily: "DM Sans, sans-serif" }}>
                {todayAppt?.title || todayAppt?.serviceName || "Clinical Consultation"}
              </h3>
              <p className="text-xs text-slate-500 font-medium">
                Conducted by {todayAppt?.employeeName || "Assigned Physician"} • {todayAppt?.location || orgName}
              </p>
            </div>

            <div className="flex items-center justify-between md:justify-end gap-5 pt-2 md:pt-0 border-t md:border-t-0 border-slate-100">
              <div className="text-left md:text-right">
                <span className="text-[11px] font-semibold text-slate-400 block uppercase">Total Amount</span>
                <span className="text-2xl font-bold font-mono text-slate-900">
                  ${(matchedInvoice?.total || 78.75).toFixed(2)}
                </span>
              </div>

              <div>
                {matchedInvoice?.status === "paid" ? (
                  <button
                    type="button"
                    onClick={() => navigate("/patient/bill")}
                    className="px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer shadow-xs"
                    style={{ fontFamily: "Outfit, sans-serif" }}
                  >
                    <FileText className="w-4 h-4" />
                    <span>View Receipt</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => navigate(`/patient/pay/${matchedInvoice?.id || ""}`)}
                    className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer shadow-xs"
                    style={{ fontFamily: "Outfit, sans-serif" }}
                  >
                    <CreditCard className="w-4 h-4" />
                    <span>Pay Now (${(matchedInvoice?.total || 78.75).toFixed(2)})</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      ) : todayAppt ? (
        /* TODAY'S ACTIVE / SCHEDULED APPOINTMENT CARD */
        <div className="bg-white rounded-3xl border border-slate-200/90 p-5 sm:p-6 shadow-xs transition-all hover:border-slate-300">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <span className="px-3 py-1 rounded-full text-xs font-bold bg-blue-50 text-blue-700 border border-blue-200 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-blue-600" />
                <span>Today's Appointment</span>
              </span>
            </div>

            <div className="flex items-center gap-2">
              {todayAppt.status === "checked-in" ? (
                <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  <span>Checked In at Clinic</span>
                </span>
              ) : (
                <span className="px-3 py-1 rounded-full text-xs font-bold bg-blue-50 text-blue-700 border border-blue-200 capitalize">
                  {todayAppt.status}
                </span>
              )}
            </div>
          </div>

          <div className="pt-4 flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-2">
              <h3 className="text-base sm:text-lg font-bold text-slate-900" style={{ fontFamily: "DM Sans, sans-serif" }}>
                {todayAppt.title || todayAppt.serviceName || "Clinical Consultation"}
              </h3>

              <div className="flex flex-wrap items-center gap-y-1.5 gap-x-4 text-xs text-slate-500 font-medium" style={{ fontFamily: "Outfit, sans-serif" }}>
                <span className="flex items-center gap-1 text-slate-700 font-semibold">
                  <Clock className="w-3.5 h-3.5 text-blue-600" />
                  <span>{todayAppt.time || "10:00 AM"} ({todayAppt.duration || 30} mins)</span>
                </span>
                <span className="flex items-center gap-1">
                  <Stethoscope className="w-3.5 h-3.5 text-slate-400" />
                  <span>{todayAppt.employeeName || "Assigned Physician"}</span>
                </span>
                <span className="flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5 text-slate-400" />
                  <span>{todayAppt.location || orgName}{roomDisplay ? ` • ${roomDisplay}` : ""}</span>
                </span>
              </div>

              {roomDirection && (
                <div className="pt-1">
                  <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-blue-700 bg-blue-50/80 px-2.5 py-1 rounded-lg border border-blue-100">
                    <Info className="w-3 h-3 text-blue-600" />
                    <span>Clinic Direction: {roomDirection}</span>
                  </span>
                </div>
              )}
            </div>

            <div className="flex items-center gap-3 self-start md:self-center shrink-0">
              <button
                type="button"
                onClick={() => setShowQrModal(true)}
                className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer shadow-xs"
                style={{ fontFamily: "Outfit, sans-serif" }}
              >
                <QrCode className="w-4 h-4" />
                <span>Check-In Pass</span>
              </button>
            </div>
          </div>
        </div>
      ) : (
        /* NO APPOINTMENT SCHEDULED TODAY */
        <div className="bg-white rounded-3xl border border-slate-200/90 p-6 sm:p-7 shadow-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-5">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-2xl bg-blue-50 border border-blue-100 text-blue-600 flex items-center justify-center shrink-0">
                <Calendar className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <h3 className="text-base font-bold text-slate-900" style={{ fontFamily: "DM Sans, sans-serif" }}>
                  No Appointments Scheduled Today
                </h3>
                <p className="text-xs text-slate-500 max-w-md leading-relaxed" style={{ fontFamily: "Outfit, sans-serif" }}>
                  You don't have any appointments scheduled for today. Book a slot whenever you need a consultation or follow-up with your doctor.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => navigate("/patient/book")}
              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer self-start sm:self-center shrink-0"
              style={{ fontFamily: "Outfit, sans-serif" }}
            >
              <Plus className="w-4 h-4" />
              <span>Book Appointment</span>
            </button>
          </div>
        </div>
      )}

      {/* ── 3. ACTIVITY TIMELINE (PREMIUM CLEAN UI) ── */}
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden">
        {/* Clean Header without redundant internal CRM stage titles */}
        <div className="p-6 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center border border-blue-100">
              <Activity className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-slate-900" style={{ fontFamily: "DM Sans, sans-serif" }}>
                Activity Timeline
              </h2>
              <p className="text-xs text-slate-500" style={{ fontFamily: "Outfit, sans-serif" }}>
                Real-time updates for your consultation and care steps
              </p>
            </div>
          </div>
        </div>

            <div className="p-6">
              {!activeProcess ? (
                <div className="text-center py-10 px-4 space-y-3">
                  <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto border border-slate-200">
                    <Layers className="w-6 h-6" />
                  </div>
                  <h3 className="text-sm font-bold text-slate-800">No Care Journey Assigned</h3>
                  <p className="text-xs text-slate-500 max-w-sm mx-auto">
                    This patient is not currently enrolled in a care journey process connected to the Patient Portal. Once a process is assigned and configured in Workflows, today's activities will appear here.
                  </p>
                </div>
              ) : !isCheckedIn ? (
                <div className="text-center py-10 space-y-3">
                  <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-500 flex items-center justify-center mx-auto border border-amber-100">
                    <QrCode className="w-6 h-6" />
                  </div>
                  <h3 className="text-sm font-bold text-slate-800">Hospital Check-In Required</h3>
                  <p className="text-xs text-slate-500 max-w-sm mx-auto">
                    Today's activities timeline activates once you check in at the reception kiosk or show your digital pass.
                  </p>
                  <button
                    type="button"
                    onClick={() => navigate("/patient/checkin")}
                    className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer"
                  >
                    <QrCode className="w-4 h-4" />
                    <span>Open Check-In Scanner</span>
                  </button>
                </div>
              ) : portalEnabledStages.length === 0 ? (
                <div className="text-center py-10 px-4 space-y-3">
                  <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-500 flex items-center justify-center mx-auto border border-blue-100">
                    <Info className="w-6 h-6" />
                  </div>
                  <h3 className="text-sm font-bold text-slate-800">No Portal Activities Configured</h3>
                  <p className="text-xs text-slate-500 max-w-sm mx-auto">
                    No stages have been configured for the Patient Portal in this process yet. Configure stage card titles and details in Workflows to display activity cards.
                  </p>
                </div>
              ) : (
                /* Activity Timeline: Show only reached stages, with In Progress at the top */
                (() => {
                  const reachedStages = portalEnabledStages
                    .filter((stage) => {
                      const rawIndex = allStages.findIndex((s) => s.id === stage.id);
                      return rawIndex <= activeIdx;
                    })
                    .sort((a, b) => {
                      const aIdx = allStages.findIndex((s) => s.id === a.id);
                      const bIdx = allStages.findIndex((s) => s.id === b.id);
                      if (aIdx === activeIdx) return -1;
                      if (bIdx === activeIdx) return 1;
                      return bIdx - aIdx;
                    });

                  if (reachedStages.length === 0) {
                    return (
                      <div className="text-center py-10 px-4 space-y-3">
                        <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-500 flex items-center justify-center mx-auto border border-blue-100">
                          <Clock className="w-6 h-6" />
                        </div>
                        <h3 className="text-sm font-bold text-slate-800">Waiting for Stage Activation</h3>
                        <p className="text-xs text-slate-500 max-w-sm mx-auto">
                          Activity cards will appear here as you advance through your care journey steps.
                        </p>
                      </div>
                    );
                  }

                  return (
                    <div className="space-y-0">
                      {reachedStages.map((stage, idx) => {
                        const rawIndex = allStages.findIndex((s) => s.id === stage.id);
                        const isCompleted = rawIndex < activeIdx;
                        const isCurrent = rawIndex === activeIdx;
                        const isLast = idx === reachedStages.length - 1;

                        // Clean Title & Description without internal CRM stage names
                        const title = stage.portalReceptionSettings?.cardTitle || stage.name;
                        const desc = stage.portalReceptionSettings?.cardDescription || stage.description;
                        const activityTime = getStageTime(rawIndex, activeIdx, todayAppt);

                        return (
                          <div key={stage.id} className="relative flex items-stretch gap-4 sm:gap-6 pb-6 last:pb-0 group">
                            {/* Clean Connecting Line & Node Rail */}
                            <div className="flex flex-col items-center">
                              <div
                                className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 z-10 transition-all shadow-xs ${
                                  isCurrent
                                    ? "bg-blue-600 text-white ring-4 ring-blue-100"
                                    : "bg-emerald-500 text-white"
                                }`}
                              >
                                {isCurrent ? (
                                  <Radio className="w-4 h-4 text-white" />
                                ) : (
                                  <CheckCircle2 className="w-4.5 h-4.5 text-white" />
                                )}
                              </div>

                              {!isLast && (
                                <div className="w-0.5 flex-1 bg-slate-200 my-1 group-hover:bg-slate-300 transition-colors" />
                              )}
                            </div>

                            {/* Premium Activity Card */}
                            <div className="flex-1 min-w-0 pb-1">
                              <div
                                className={`p-4 sm:p-5 rounded-2xl border transition-all ${
                                  isCurrent
                                    ? "bg-gradient-to-r from-blue-50/70 via-indigo-50/30 to-white border-blue-200 shadow-sm"
                                    : "bg-white border-slate-200/90 hover:border-slate-300 shadow-2xs"
                                }`}
                              >
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                                  <div className="space-y-1.5 min-w-0">
                                    {/* Time & Status row - NO CRM STAGE NAMES */}
                                    <div className="flex flex-wrap items-center gap-2.5">
                                      <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 bg-slate-100/80 px-2.5 py-0.5 rounded-md">
                                        <Clock className="w-3.5 h-3.5 text-slate-400" />
                                        <span>{activityTime}</span>
                                      </div>

                                      {isCurrent && (
                                        <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-blue-100/80 text-blue-800 border border-blue-200 flex items-center gap-1.5 font-semibold">
                                          <span className="w-1.5 h-1.5 rounded-full bg-blue-600 animate-ping" />
                                          <span>In Progress</span>
                                        </span>
                                      )}

                                      {isCompleted && (
                                        <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1">
                                          <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                                          <span>Completed</span>
                                        </span>
                                      )}
                                    </div>

                                    <h3
                                      className="text-sm sm:text-base font-bold text-slate-900"
                                      style={{ fontFamily: "DM Sans, sans-serif" }}
                                    >
                                      {title}
                                    </h3>

                                    {desc && (
                                      <p className="text-xs text-slate-500 leading-relaxed max-w-xl">
                                        {desc}
                                      </p>
                                    )}
                                  </div>

                                  {/* View Details CTA Button */}
                                  <div className="self-end sm:self-center shrink-0">
                                    <button
                                      type="button"
                                      onClick={() => setSelectedStageForDrawer(stage)}
                                      className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs ${
                                        isCurrent
                                          ? "bg-blue-600 hover:bg-blue-700 text-white"
                                          : "bg-white hover:bg-slate-50 text-slate-700 border border-slate-200"
                                      }`}
                                      style={{ fontFamily: "Outfit, sans-serif" }}
                                    >
                                      <FileText className="w-3.5 h-3.5" />
                                      <span>View Details</span>
                                      <ChevronRight className="w-3.5 h-3.5 opacity-70" />
                                    </button>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  );
                })()
              )}
            </div>
          </div>

      {/* ── CLIENT PORTAL STAGE DETAIL DRAWER ── */}
      {selectedStageForDrawer && (
        <div className="fixed inset-0 z-50 flex justify-end overflow-hidden animate-in fade-in duration-200">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/40 backdrop-blur-2xs transition-opacity"
            onClick={() => setSelectedStageForDrawer(null)}
          />

          {/* Drawer Content */}
          <div
            className="relative w-full max-w-lg bg-white shadow-2xl h-full flex flex-col z-50 border-l border-slate-200 animate-in slide-in-from-right duration-300"
            style={{ fontFamily: "Outfit, sans-serif" }}
          >
            {/* Drawer Header */}
            <div className="flex items-center justify-between px-6 py-5 border-b border-slate-200 bg-gradient-to-r from-slate-50 to-white flex-shrink-0">
              <div className="flex items-center gap-3 min-w-0">
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center text-white shadow-xs shrink-0"
                  style={{ backgroundColor: selectedStageForDrawer.color || "#3B82F6" }}
                >
                  <FileText className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-bold text-slate-900 truncate">
                      {selectedStageForDrawer.portalReceptionSettings?.cardTitle || selectedStageForDrawer.name}
                    </h3>
                  </div>
                  <p className="text-xs text-slate-500 font-medium truncate">
                    Stage: {selectedStageForDrawer.name} • {activeProcess.name}
                  </p>
                </div>
              </div>

              <button
                onClick={() => setSelectedStageForDrawer(null)}
                className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer shrink-0"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Drawer Body: Rendered HTML Content */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200/80 flex items-center gap-3">
                <Info className="w-4 h-4 text-blue-600 shrink-0" />
                <p className="text-xs text-slate-600">
                  Detailed stage guidance customized for your clinical visit.
                </p>
              </div>

              {/* Rendered HTML */}
              <div className="p-5 rounded-2xl border border-slate-200 bg-white shadow-xs prose prose-slate max-w-none text-sm leading-relaxed [&_h3]:text-base [&_h3]:font-bold [&_h3]:text-slate-900 [&_h3]:mb-2 [&_p]:text-slate-600 [&_p]:mb-2 [&_strong]:text-slate-900">
                <div
                  dangerouslySetInnerHTML={{
                    __html: renderDrawerHtml(selectedStageForDrawer),
                  }}
                />
              </div>
            </div>

            {/* Drawer Footer */}
            <div className="p-4 border-t border-slate-200 bg-slate-50/80 flex items-center justify-end flex-shrink-0">
              <button
                type="button"
                onClick={() => setSelectedStageForDrawer(null)}
                className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer"
              >
                Close Details
              </button>
            </div>
          </div>
        </div>
      )}

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
