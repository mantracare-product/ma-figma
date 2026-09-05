import React, { useState } from "react";
import { CustomSideDrawer } from "../ui/drawer";
import {
  Calendar,
  Clock,
  User,
  Stethoscope,
  ShieldCheck,
  ShieldAlert,
  Shield,
  RefreshCw,
  Sparkles,
  FileText,
  Receipt,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Phone,
  Mail,
  Video,
  MapPin,
  Tag,
  ExternalLink,
  ChevronRight,
  Edit3,
  Building2,
  Check,
  RotateCcw,
  GripVertical,
  Code2,
  HelpCircle,
} from "lucide-react";
import { toast } from "sonner";
import { recordAppointmentEligibility, getEligibilityTermsForService } from "../../../lib/rcmStore";
import { EligibilityStatus } from "../../types/rcmTypes";
import { Tooltip } from "../ui/Tooltip";
import { getStoredServices } from "../../../lib/servicesStore";
import EligibilityDetailDrawer from "./EligibilityDetailDrawer";

export interface AppointmentDetailData {
  id: number | string;
  clientName: string;
  clientId?: string;
  clientEmail?: string;
  clientPhone?: string;
  clientStatus?: string;
  clientAvatar?: string;
  employeeId?: number | string;
  providerName?: string;
  providerEmail?: string;
  serviceId?: number | string;
  serviceName?: string;
  service?: string;
  title?: string;
  description?: string;
  notes?: string;
  date: string;
  time: string;
  duration?: number;
  sessionType?: "video" | "inPerson";
  status: "scheduled" | "completed" | "cancelled" | "no-show" | "pending-accept" | "pending";
  tags?: string[];
  processId?: string;
  stageId?: string;
  invoiceId?: string;
  eligibility?: string;
  eligibilityStatus?: string;
  eligibilityPayer?: string;
  eligibilityCopay?: number;
  eligibilityDeductible?: number;
  eligibilityCoinsurance?: number;
  eligibilityCheck?: {
    status: EligibilityStatus;
    payerName: string;
    memberId?: string;
    copayAmount?: number;
    deductibleRemaining?: number;
    coinsurance?: number;
    checkedAt?: string;
    terminationReason?: string;
    inconclusiveReason?: string;
  };
  primaryInsurance?: string;
  secondaryInsurance?: string;
  preCertification?: string;
  syncToCase?: boolean;
}

export interface AppointmentDetailDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  appointment: AppointmentDetailData | null;
  onReschedule?: (appt: AppointmentDetailData) => void;
  onMarkComplete?: (apptId: number | string) => void;
  onOpenInvoice?: (invoiceId: string) => void;
  onOpenChartNote?: (appt: AppointmentDetailData) => void;
  onStatusChange?: (apptId: number | string, newStatus: string) => void;
}

export default function AppointmentDetailDrawer({
  isOpen,
  onClose,
  appointment,
  onReschedule,
  onMarkComplete,
  onOpenInvoice,
  onOpenChartNote,
  onStatusChange,
}: AppointmentDetailDrawerProps) {
  if (!appointment) return null;

  const [isVerifying, setIsVerifying] = useState(false);
  const [selectedScenario, setSelectedScenario] = useState<string>("auto");
  const [showDevScenarios, setShowDevScenarios] = useState(false);
  const [isDetailedDrawerOpen, setIsDetailedDrawerOpen] = useState(false);
  const [localEligibility, setLocalEligibility] = useState<{
    status: EligibilityStatus;
    payerName: string;
    memberId?: string;
    copayAmount?: number;
    deductibleRemaining?: number;
    coinsurance?: number;
    checkedAt?: string;
    terminationReason?: string;
    inconclusiveReason?: string;
  } | null>(() => {
    return appointment.eligibilityCheck || null;
  });

  // Keep synced if incoming appointment eligibility updates
  React.useEffect(() => {
    setLocalEligibility(appointment.eligibilityCheck || null);
  }, [appointment.id, appointment.eligibilityCheck]);

  // Format date helper
  const formatDateTime = (dateStr: string, timeStr: string) => {
    let datePart = dateStr || "—";
    try {
      const parts = dateStr?.split("-");
      if (parts?.length === 3) {
        const d = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
        datePart = d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
      }
    } catch { /* noop */ }
    if (!timeStr) return datePart;
    try {
      const [h, m] = timeStr.split(":");
      const hour = parseInt(h, 10);
      const ampm = hour >= 12 ? "PM" : "AM";
      const h12 = hour % 12 || 12;
      return `${datePart} at ${h12}:${m} ${ampm}`;
    } catch {
      return `${datePart} at ${timeStr}`;
    }
  };

  // Re-run eligibility simulation
  const handleRecheckEligibility = (scenarioOverride?: string) => {
    setIsVerifying(true);
    const scenario = scenarioOverride || selectedScenario;

    setTimeout(() => {
      const srvName = appointment.serviceName || appointment.service || appointment.title || "Clinical Consultation";
      let srvPrice = Number((appointment as any).price || (appointment as any).servicePrice || 0);
      if (srvPrice <= 0) {
        const matched = getStoredServices().find(
          (s) =>
            (appointment.serviceId && String(s.id) === String(appointment.serviceId)) ||
            (srvName && s.name.toLowerCase() === srvName.toLowerCase())
        );
        if (matched && matched.price > 0) {
          srvPrice = matched.price;
        } else {
          srvPrice = srvName.toLowerCase().includes("follow-up") ? 75 : 150;
        }
      }

      let resolvedStatus: EligibilityStatus = "active";
      let resolvedPayer = appointment.primaryInsurance || appointment.eligibilityPayer || "Blue Cross Blue Shield";
      const dynamicTerms = getEligibilityTermsForService(srvName, srvPrice, resolvedPayer);

      let copay: number | undefined = dynamicTerms.copayAmount;
      let deductible: number | undefined = dynamicTerms.deductibleRemaining;
      let coinsurance: number | undefined = dynamicTerms.coinsurance;
      let terminationReason: string | undefined = undefined;
      let inconclusiveReason: string | undefined = undefined;
      let memberId: string | undefined = `BCBS-${Math.floor(10000000 + Math.random() * 90000000)}`;

      if (scenario === "inactive") {
        resolvedStatus = "inactive";
        resolvedPayer = "UnitedHealthcare";
        copay = undefined;
        deductible = undefined;
        coinsurance = undefined;
        terminationReason = "Coverage lapsed on 2026-01-31 (Benefit lapse / Non-payment)";
        memberId = "UHC-99201941";
      } else if (scenario === "not_covered") {
        resolvedStatus = "not_covered";
        resolvedPayer = "Cigna Healthcare";
        copay = undefined;
        deductible = undefined;
        coinsurance = undefined;
        terminationReason = "Service CPT code not covered under current benefit policy";
        memberId = "CIG-44820194";
      } else if (scenario === "inconclusive") {
        resolvedStatus = "inconclusive";
        resolvedPayer = "Aetna Better Health";
        copay = undefined;
        deductible = undefined;
        coinsurance = undefined;
        inconclusiveReason = "Member DOB mismatch between provider chart and payer registry";
        memberId = "AET-883011";
      } else if (scenario === "self_pay") {
        resolvedStatus = "self_pay";
        resolvedPayer = "Self-Pay / Patient Direct";
        copay = undefined;
        deductible = undefined;
        coinsurance = undefined;
        memberId = undefined;
      } else {
        // active default
        resolvedStatus = "active";
        resolvedPayer = appointment.primaryInsurance || appointment.eligibilityPayer || "Blue Cross Blue Shield";
        const terms = getEligibilityTermsForService(srvName, srvPrice, resolvedPayer);
        copay = terms.copayAmount;
        deductible = terms.deductibleRemaining;
        coinsurance = terms.coinsurance;
      }

      const result = {
        status: resolvedStatus,
        payerName: resolvedPayer,
        memberId,
        copayAmount: copay,
        deductibleRemaining: deductible,
        coinsurance,
        terminationReason,
        inconclusiveReason,
        checkedAt: new Date().toISOString(),
      };

      // Persist to RCM Store
      recordAppointmentEligibility({
        appointmentId: appointment.id,
        clientId: String(appointment.clientId || ""),
        clientName: appointment.clientName,
        appointmentDate: appointment.date,
        status: resolvedStatus,
        payerName: resolvedPayer,
        memberId,
        serviceName: srvName,
        servicePrice: srvPrice,
        copayAmount: copay,
        deductibleRemaining: deductible,
        coinsurance,
        terminationReason,
        inconclusiveReason,
      });

      // Update session storage
      try {
        const raw = sessionStorage.getItem("appointments_v1");
        if (raw) {
          const list = JSON.parse(raw);
          const updated = list.map((a: any) =>
            String(a.id) === String(appointment.id)
              ? {
                  ...a,
                  eligibility: resolvedStatus,
                  eligibilityStatus: resolvedStatus,
                  eligibilityCheck: result,
                }
              : a
          );
          sessionStorage.setItem("appointments_v1", JSON.stringify(updated));
        }
      } catch {}

      setLocalEligibility(result);
      setIsVerifying(false);

      if (resolvedStatus === "active") {
        toast.success(`Eligibility verified: Active coverage confirmed with ${resolvedPayer}`);
      } else if (resolvedStatus === "inactive") {
        toast.error(`Eligibility check: Inactive coverage (${resolvedPayer})`);
      } else if (resolvedStatus === "inconclusive") {
        toast.warning(`Eligibility inconclusive: ${inconclusiveReason}`);
      } else {
        toast.info(`Eligibility updated to ${resolvedStatus}`);
      }
    }, 600);
  };

  const getStatusBadge = (status: string) => {
    const s = (status || "").toLowerCase();
    if (s === "completed") {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Completed
        </span>
      );
    }
    if (s === "scheduled") {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">
          <Clock className="w-3.5 h-3.5 text-blue-600" /> Scheduled
        </span>
      );
    }
    if (s === "cancelled") {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200">
          <XCircle className="w-3.5 h-3.5 text-rose-600" /> Cancelled
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-800 border border-amber-200">
        <AlertCircle className="w-3.5 h-3.5 text-amber-600" /> {status}
      </span>
    );
  };

  const serviceTitle =
    appointment.serviceName ||
    appointment.service ||
    appointment.title ||
    "Initial Consultation";

  return (
    <>
      <CustomSideDrawer
        isOpen={isOpen}
        onClose={onClose}
      maxWidth="w-full sm:w-[32vw] sm:max-w-[480px] min-w-[350px]"
      title={
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#181e25] to-[#2c3e50] text-white flex items-center justify-center shadow-xs">
            <Calendar className="w-4 h-4 text-blue-400" />
          </div>
          <div className="min-w-0">
            <h3
              className="text-base font-bold text-[#181e25] truncate"
              style={{ fontFamily: "Outfit, sans-serif" }}
            >
              Appointment Details
            </h3>
            <p className="text-xs text-slate-500 font-mono">
              ID #{appointment.id}
            </p>
          </div>
        </div>
      }
      footer={
        <div className="flex items-center justify-between gap-2 w-full pt-2">
          {appointment.status === "scheduled" && onMarkComplete && (
            <button
              type="button"
              onClick={() => onMarkComplete(appointment.id)}
              className="px-3.5 py-2 rounded-xl text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 transition-colors flex items-center gap-1.5 cursor-pointer"
              style={{ fontFamily: "Outfit, sans-serif" }}
            >
              <Check className="w-3.5 h-3.5" /> Mark Complete
            </button>
          )}

          {onReschedule && appointment.status === "scheduled" && (
            <button
              type="button"
              onClick={() => onReschedule(appointment)}
              className="px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 transition-colors flex items-center gap-1.5 cursor-pointer"
              style={{ fontFamily: "Outfit, sans-serif" }}
            >
              <Edit3 className="w-3.5 h-3.5" /> Reschedule
            </button>
          )}

          <button
            type="button"
            onClick={onClose}
            className="ml-auto px-5 py-2 rounded-xl text-xs font-semibold text-white bg-[#181e25] hover:bg-slate-800 transition-all shadow-xs cursor-pointer flex items-center gap-1.5"
            style={{ fontFamily: "Outfit, sans-serif" }}
          >
            Done
          </button>
        </div>
      }
    >
      <div className="space-y-4 pb-6" style={{ fontFamily: "DM Sans, sans-serif" }}>

        {/* ── SECTION 1: APPOINTMENT DETAILS ── */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
          {/* Section Header */}
          <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-white">
            <div className="flex items-center gap-2">
              <GripVertical className="w-3.5 h-3.5 text-slate-400" />
              <span
                className="text-xs font-bold text-slate-800 uppercase tracking-wider"
                style={{ fontFamily: "Outfit, sans-serif" }}
              >
                Appointment Details
              </span>
            </div>
            <div>
              {getStatusBadge(appointment.status)}
            </div>
          </div>

          {/* Section Body */}
          <div className="p-4 space-y-3.5">
            {/* Field: Title & Service */}
            <div className="space-y-1.5">
              <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                <GripVertical className="w-3 h-3 text-slate-300" />
                <span>Title &amp; Service</span>
              </div>
              <div className="bg-slate-50/70 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-medium text-slate-800 flex items-center justify-between">
                <span className="font-bold text-slate-900" style={{ fontFamily: "Outfit, sans-serif" }}>
                  {appointment.title || serviceTitle}
                </span>
                <span className="flex items-center gap-1 text-[11px] font-semibold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-md border border-blue-100">
                  <Stethoscope className="w-3 h-3 text-blue-600" />
                  {serviceTitle}
                </span>
              </div>
            </div>

            {/* Field: Date & Schedule */}
            <div className="space-y-1.5">
              <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                <GripVertical className="w-3 h-3 text-slate-300" />
                <span>Date &amp; Schedule</span>
              </div>
              <div className="bg-slate-50/70 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-medium text-slate-800 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Clock className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                  <span className="font-semibold text-slate-900">
                    {formatDateTime(appointment.date, appointment.time)}
                  </span>
                  {appointment.duration && (
                    <span className="text-[11px] text-slate-500 font-mono">
                      ({appointment.duration} min)
                    </span>
                  )}
                </div>
                <span className="text-[10px] font-semibold text-slate-700 bg-white px-2 py-0.5 rounded border border-slate-200">
                  {appointment.sessionType === "inPerson" ? "In-Person Visit" : "Telehealth Video"}
                </span>
              </div>
            </div>

            {/* Field: Patient / Client */}
            <div className="space-y-1.5">
              <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                <GripVertical className="w-3 h-3 text-slate-300" />
                <span>Client / Patient</span>
              </div>
              <div className="bg-slate-50/70 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-medium text-slate-800 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-6 h-6 rounded-full bg-gradient-to-br from-blue-600 to-indigo-600 text-white font-bold flex items-center justify-center text-[10px] shrink-0">
                    {(appointment.clientName || "P")[0]}
                  </div>
                  <span className="font-bold text-slate-900" style={{ fontFamily: "Outfit, sans-serif" }}>
                    {appointment.clientName}
                  </span>
                  {appointment.clientId && (
                    <span className="text-[10px] font-mono text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-100">
                      {appointment.clientId}
                    </span>
                  )}
                </div>
                <span className="text-[11px] text-slate-500 font-mono truncate max-w-[170px]">
                  {appointment.clientPhone || appointment.clientEmail || ""}
                </span>
              </div>
            </div>

            {/* Field: Attending Provider */}
            <div className="space-y-1.5">
              <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                <GripVertical className="w-3 h-3 text-slate-300" />
                <span>Attending Provider</span>
              </div>
              <div className="bg-slate-50/70 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-medium text-slate-800 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-lg bg-indigo-50 border border-indigo-200/70 text-indigo-700 flex items-center justify-center shrink-0">
                    <Stethoscope className="w-3 h-3" />
                  </div>
                  <span className="font-bold text-slate-900" style={{ fontFamily: "Outfit, sans-serif" }}>
                    {appointment.providerName || "Assigned Provider"}
                  </span>
                </div>
                <span className="text-[10px] text-emerald-700 font-semibold bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                  Assigned
                </span>
              </div>
            </div>

            {/* Field: Notes (if present) */}
            {(appointment.notes || appointment.description) && (
              <div className="space-y-1.5">
                <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  <GripVertical className="w-3 h-3 text-slate-300" />
                  <span>Notes</span>
                </div>
                <div className="bg-slate-50/70 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-700 leading-relaxed font-normal">
                  {appointment.notes || appointment.description}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ── DEV SIMULATION DROPDOWN (Above Eligibility) ── */}
        <div className="flex items-center justify-between px-1 relative">
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
            Verification &amp; Benefits
          </span>

          <div className="relative">
            <button
              type="button"
              onClick={() => setShowDevScenarios((prev) => !prev)}
              className={`text-[11px] font-mono px-2 py-0.5 rounded transition-all cursor-pointer flex items-center gap-1 ${
                showDevScenarios
                  ? "bg-slate-900 text-emerald-400 font-bold shadow-2xs"
                  : "text-slate-400 hover:text-slate-800 hover:bg-slate-100"
              }`}
              title="Click to select simulation scenario"
            >
              &lt;dev/&gt;
            </button>

            {/* Small Dropdown Menu */}
            {showDevScenarios && (
              <>
                {/* Click outside to close */}
                <div
                  className="fixed inset-0 z-30"
                  onClick={() => setShowDevScenarios(false)}
                />

                <div className="absolute right-0 top-full mt-1.5 w-60 bg-white rounded-xl shadow-xl border border-slate-200 py-1.5 z-40 animate-in fade-in zoom-in-95 duration-100">
                  <div className="px-3 py-1.5 border-b border-slate-100 flex items-center justify-between">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider font-mono">
                      Select Scenario
                    </span>
                    <span className="text-[10px] text-emerald-600 font-mono font-medium">
                      &lt;dev/&gt;
                    </span>
                  </div>

                  <div className="py-1">
                    {[
                      {
                        id: "active",
                        label: "Active Coverage",
                        desc: "BCBS • Active Benefit",
                        tooltip: "Simulates active Blue Cross Blue Shield with service-specific copay and deductible.",
                      },
                      {
                        id: "inactive",
                        label: "Inactive Policy",
                        desc: "UnitedHealthcare • Lapsed",
                        tooltip: "Simulates coverage lapsed on 2026-01-31 due to non-payment.",
                      },
                      {
                        id: "inconclusive",
                        label: "Inconclusive Match",
                        desc: "Aetna • DOB Mismatch",
                        tooltip: "Simulates DOB mismatch between provider chart and payer registry.",
                      },
                      {
                        id: "not_covered",
                        label: "Service Not Covered",
                        desc: "Cigna • Policy Exclusion",
                        tooltip: "Simulates service CPT code excluded under current benefit policy.",
                      },
                      {
                        id: "self_pay",
                        label: "Self-Pay Direct",
                        desc: "Patient Direct Pay",
                        tooltip: "Simulates client electing self-pay with no insurance carrier billing.",
                      },
                      {
                        id: "auto",
                        label: "Auto (Standard)",
                        desc: "Default Patient Data",
                        tooltip: "Simulates standard automated verification from patient record.",
                      },
                    ].map((sc) => (
                      <div key={sc.id} className="relative group/item">
                        <button
                          type="button"
                          disabled={isVerifying}
                          title={sc.tooltip}
                          onClick={() => {
                            setSelectedScenario(sc.id);
                            setShowDevScenarios(false);
                            handleRecheckEligibility(sc.id);
                          }}
                          className={`w-full text-left px-3 py-2 hover:bg-slate-50 flex items-center justify-between transition-colors cursor-pointer disabled:opacity-50 ${
                            selectedScenario === sc.id ? "bg-blue-50/70 font-semibold text-blue-900" : "text-slate-700"
                          }`}
                        >
                          <div>
                            <div className="text-xs">{sc.label}</div>
                            <div className="text-[10px] text-slate-400 font-mono">{sc.desc}</div>
                          </div>
                          {selectedScenario === sc.id && (
                            <Check className="w-3.5 h-3.5 text-blue-600 shrink-0 ml-2" />
                          )}
                        </button>

                        {/* Floating Tooltip */}
                        <div className="pointer-events-none absolute right-full top-1/2 -translate-y-1/2 mr-2 hidden group-hover/item:block z-50 w-52 p-2 bg-slate-900 text-slate-100 text-[11px] rounded-lg shadow-lg leading-snug border border-slate-800 animate-in fade-in duration-100">
                          <p className="font-semibold text-emerald-400 mb-0.5">{sc.label}</p>
                          <p className="text-slate-300 text-[10px]">{sc.tooltip}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>
        </div>

        {/* ── SECTION 2: ELIGIBILITY & INSURANCE ── */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
          {/* Section Header */}
          <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-white">
            <div className="flex items-center gap-2">
              <GripVertical className="w-3.5 h-3.5 text-slate-400" />
              <span
                className="text-xs font-bold text-slate-800 uppercase tracking-wider"
                style={{ fontFamily: "Outfit, sans-serif" }}
              >
                Eligibility &amp; Insurance
              </span>
            </div>
            <button
              type="button"
              disabled={isVerifying}
              onClick={() => handleRecheckEligibility()}
              className="px-3.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold flex items-center gap-1.5 transition-all shadow-2xs cursor-pointer shrink-0 disabled:opacity-50"
              style={{ fontFamily: "Outfit, sans-serif" }}
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isVerifying ? "animate-spin" : ""}`} />
              <span>{isVerifying ? "Verifying..." : localEligibility ? "Re-check Eligibility" : "Check Eligibility"}</span>
            </button>
          </div>

          {/* Section Body */}
          {!localEligibility ? (
            <div className="p-8 text-center bg-slate-50/40">
              <div className="w-10 h-10 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-2.5">
                <Shield className="w-5 h-5" />
              </div>
              <p className="text-xs font-semibold text-slate-700">No Eligibility Check Performed</p>
              <p className="text-[11px] text-slate-400 mt-1 max-w-[260px] mx-auto">
                Click &quot;Check Eligibility&quot; above to verify insurance coverage and patient benefits.
              </p>
            </div>
          ) : (
            <div className="p-4 space-y-3.5">
              {/* Field: Coverage Status */}
              <div className="space-y-1.5">
                <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  <GripVertical className="w-3 h-3 text-slate-300" />
                  <span>Coverage Status</span>
                  <Tooltip text="The patient's current insurance active standing determining if claims will be accepted or rejected by the payer.">
                    <HelpCircle className="w-3 h-3 text-slate-400 hover:text-slate-600 cursor-help transition-colors" />
                  </Tooltip>
                </div>
                <div className="bg-slate-50/70 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-medium text-slate-800 w-full flex items-center justify-between">
                  <span className="font-bold text-slate-900" style={{ fontFamily: "Outfit, sans-serif" }}>
                    {localEligibility.status === "active"
                      ? "Active Coverage"
                      : localEligibility.status === "inactive"
                      ? "Inactive Policy"
                      : localEligibility.status === "not_covered"
                      ? "Service Not Covered"
                      : localEligibility.status === "inconclusive"
                      ? "Inconclusive Match"
                      : localEligibility.status === "self_pay"
                      ? "Self-Pay"
                      : localEligibility.status}
                  </span>
                  <span className="text-[11px] text-slate-500 font-mono">
                    Status
                  </span>
                </div>
              </div>

              {/* Field: Primary Insurance Provider */}
              <div className="space-y-1.5">
                <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  <GripVertical className="w-3 h-3 text-slate-300" />
                  <span>Primary Insurance Provider</span>
                  <Tooltip text="The main insurance payer billed first for services before secondary coverage or patient balance.">
                    <HelpCircle className="w-3 h-3 text-slate-400 hover:text-slate-600 cursor-help transition-colors" />
                  </Tooltip>
                </div>
                <div className="bg-slate-50/70 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-medium text-slate-800 w-full flex items-center justify-between">
                  <span className="font-bold text-slate-900" style={{ fontFamily: "Outfit, sans-serif" }}>
                    {appointment.primaryInsurance || localEligibility.payerName || "—"}
                  </span>
                  <span className="text-[11px] text-slate-500">Primary Payer</span>
                </div>
              </div>

              {/* Field: Secondary Insurance Provider (if present) */}
              {appointment.secondaryInsurance && (
                <div className="space-y-1.5">
                  <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    <GripVertical className="w-3 h-3 text-slate-300" />
                    <span>Secondary Insurance Provider</span>
                    <Tooltip text="Supplemental insurance billed for remaining balances after the primary payer processes the claim.">
                      <HelpCircle className="w-3 h-3 text-slate-400 hover:text-slate-600 cursor-help transition-colors" />
                    </Tooltip>
                  </div>
                  <div className="bg-slate-50/70 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-medium text-slate-800 w-full flex items-center justify-between">
                    <span className="font-bold text-slate-900" style={{ fontFamily: "Outfit, sans-serif" }}>
                      {appointment.secondaryInsurance}
                    </span>
                    <span className="text-[11px] text-slate-500">Secondary Payer</span>
                  </div>
                </div>
              )}

              {/* Field: Pre-Certification (if present) */}
              {appointment.preCertification && (
                <div className="space-y-1.5">
                  <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    <GripVertical className="w-3 h-3 text-slate-300" />
                    <span>Pre-Certification / Auth</span>
                    <Tooltip text="Confirms the payer has pre-approved this specific service as medically necessary before the visit.">
                      <HelpCircle className="w-3 h-3 text-slate-400 hover:text-slate-600 cursor-help transition-colors" />
                    </Tooltip>
                  </div>
                  <div className="bg-slate-50/70 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-medium text-slate-800 w-full flex items-center justify-between">
                    <span className="font-mono font-semibold text-slate-800">
                      {appointment.preCertification}
                    </span>
                    <span className="text-[11px] text-emerald-600 font-medium">Pre-Authorized</span>
                  </div>
                </div>
              )}

              {/* Field: Member Policy ID */}
              <div className="space-y-1.5">
                <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  <GripVertical className="w-3 h-3 text-slate-300" />
                  <span>Member Policy ID</span>
                  <Tooltip text="Unique subscriber identification number required on claims to route benefits to this patient.">
                    <HelpCircle className="w-3 h-3 text-slate-400 hover:text-slate-600 cursor-help transition-colors" />
                  </Tooltip>
                </div>
                <div className="bg-slate-50/70 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-medium text-slate-800 w-full flex items-center justify-between">
                  <span className="font-mono text-slate-900 font-semibold">
                    {localEligibility.memberId || "—"}
                  </span>
                  <span className="text-[11px] text-slate-500 font-mono">Policy ID</span>
                </div>
              </div>

              {/* Field: Copay */}
              <div className="space-y-1.5">
                <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  <GripVertical className="w-3 h-3 text-slate-300" />
                  <span>Copay</span>
                  <Tooltip text="A fixed amount the patient pays per visit, regardless of the total service cost.">
                    <HelpCircle className="w-3 h-3 text-slate-400 hover:text-slate-600 cursor-help transition-colors" />
                  </Tooltip>
                </div>
                <div className="bg-slate-50/70 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-medium text-slate-800 w-full flex items-center justify-between">
                  <span className="font-bold text-slate-900 font-mono">
                    {localEligibility.copayAmount !== undefined ? `$${localEligibility.copayAmount}` : "—"}
                  </span>
                  <span className="text-[11px] text-slate-500">Fixed Fee Per Visit</span>
                </div>
              </div>

              {/* Field: Deductible Remaining */}
              <div className="space-y-1.5">
                <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  <GripVertical className="w-3 h-3 text-slate-300" />
                  <span>Deductible Remaining</span>
                  <Tooltip text="How much of the patient's annual deductible is still unmet — this amount is owed by the patient before insurance starts contributing, unless a copay applies instead.">
                    <HelpCircle className="w-3 h-3 text-slate-400 hover:text-slate-600 cursor-help transition-colors" />
                  </Tooltip>
                </div>
                <div className="bg-slate-50/70 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-medium text-slate-800 w-full flex items-center justify-between">
                  <span className="font-bold text-slate-900 font-mono">
                    {localEligibility.deductibleRemaining !== undefined ? `$${localEligibility.deductibleRemaining}` : "—"}
                  </span>
                  <span className="text-[11px] text-slate-500">Remaining Balance</span>
                </div>
              </div>

              {/* Field: Coinsurance */}
              <div className="space-y-1.5">
                <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  <GripVertical className="w-3 h-3 text-slate-300" />
                  <span>Coinsurance</span>
                  <Tooltip text="The percentage of the remaining cost the patient owes after the deductible has been met.">
                    <HelpCircle className="w-3 h-3 text-slate-400 hover:text-slate-600 cursor-help transition-colors" />
                  </Tooltip>
                </div>
                <div className="bg-slate-50/70 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-medium text-slate-800 w-full flex items-center justify-between">
                  <span className="font-bold text-slate-900 font-mono">
                    {localEligibility.coinsurance !== undefined ? `${localEligibility.coinsurance}%` : "—"}
                  </span>
                  <span className="text-[11px] text-slate-500">Patient Share</span>
                </div>
              </div>

              {/* Field: Verified At */}
              <div className="space-y-1.5">
                <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  <GripVertical className="w-3 h-3 text-slate-300" />
                  <span>Verified At</span>
                  <Tooltip text="Timestamp of the most recent 270/271 electronic eligibility check confirming active benefits.">
                    <HelpCircle className="w-3 h-3 text-slate-400 hover:text-slate-600 cursor-help transition-colors" />
                  </Tooltip>
                </div>
                <div className="bg-slate-50/70 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-medium text-slate-800 w-full flex items-center justify-between">
                  <span className="font-mono text-slate-700">
                    {localEligibility.checkedAt
                      ? new Date(localEligibility.checkedAt).toLocaleString("en-US", {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })
                      : "—"}
                  </span>
                  <span className="text-[11px] text-slate-500 font-mono">Timestamp</span>
                </div>
              </div>

              {/* Payer Notice (if any) */}
              {(localEligibility.inconclusiveReason || localEligibility.terminationReason) && (
                <div className="space-y-1.5">
                  <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    <GripVertical className="w-3 h-3 text-slate-300" />
                    <span>Payer Notice</span>
                  </div>
                  <div className="bg-slate-50/70 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-700 leading-relaxed font-normal w-full">
                    {localEligibility.inconclusiveReason || localEligibility.terminationReason}
                  </div>
                </div>
              )}

              {/* CTA: View Detailed Eligibility Response (270/271) */}
              <div className="pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsDetailedDrawerOpen(true)}
                  className="w-full py-2.5 px-3.5 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-semibold flex items-center justify-center gap-2 transition-colors border border-blue-200/80 cursor-pointer shadow-2xs"
                  style={{ fontFamily: "Outfit, sans-serif" }}
                >
                  <ExternalLink className="w-3.5 h-3.5 text-blue-600" />
                  <span>View Detailed Eligibility</span>
                </button>
              </div>
            </div>
          )}
        </div>

      </div>
    </CustomSideDrawer>

    {/* Detailed Eligibility Response Drawer */}
    <EligibilityDetailDrawer
      isOpen={isDetailedDrawerOpen}
      onClose={() => setIsDetailedDrawerOpen(false)}
      appointmentId={appointment.id}
      clientId={appointment.clientId}
      clientName={appointment.clientName}
      serviceType={appointment.serviceName || appointment.service || appointment.title}
      dateOfService={appointment.date}
      servicePrice={Number((appointment as any).price || (appointment as any).servicePrice || 0)}
      payerName={appointment.primaryInsurance || localEligibility?.payerName}
      memberId={localEligibility?.memberId}
      onEligibilityUpdated={(res) => {
        const copay = res.benefitLines.find((b) => b.category === "Copay")?.amount;
        const deductible = res.benefitLines.find((b) => b.category === "Deductible" && b.timePeriod === "Remaining")?.amount;
        const coinsurance = res.benefitLines.find((b) => b.category === "Coinsurance")?.percent;

        setLocalEligibility({
          status: res.status,
          payerName: res.payerName,
          memberId: res.memberId,
          copayAmount: copay,
          deductibleRemaining: deductible,
          coinsurance: coinsurance,
          checkedAt: res.checkedAt,
        });
      }}
    />
    </>
  );
}
