import { useState } from "react";
import {
  Calendar,
  Clock,
  Check,
  X,
  Video,
  MessageCircle,
  Star,
  User,
  MoreVertical,
  CalendarIcon,
  XCircle,
  AlertCircle,
  AlertTriangle,
  Trash2,
  ShieldCheck,
  ShieldAlert,
  Shield,
  RefreshCw,
  CreditCard,
  ExternalLink,
} from "lucide-react";
import { useRcm } from "../../context/RcmContext";
import RecordPaymentModal from "../invoices/RecordPaymentModal";
import { toast } from "sonner";

interface Appointment {
  id: number;
  clientId?: string;
  clientName: string;
  clientEmail: string;
  clientPhone: string;
  employeeId: number;
  serviceId: number;
  date: string;
  time: string;
  duration: number;
  status: "scheduled" | "completed" | "cancelled" | "no-show" | "pending-accept";
  notes?: string;
  rating?: number;
  title?: string;
  description?: string;
  tags?: string[];
  processId?: string;
  stageId?: string;
}

interface Employee {
  id: number;
  name: string;
  email: string;
}

interface Service {
  id: number;
  name: string;
  duration: number;
  price: number;
}

interface AppointmentCardProps {
  appointment: Appointment;
  employee?: Employee;
  service?: Service;
  onCancel?: (id: number) => void;
  onReschedule?: (id: number) => void;
  onMarkComplete?: (id: number) => void;
}

export default function AppointmentCard({
  appointment,
  employee,
  service,
  onCancel,
  onReschedule,
  onMarkComplete,
}: AppointmentCardProps) {
  const [showMenu, setShowMenu] = useState(false);
  const [showEligibilityPopover, setShowEligibilityPopover] = useState(false);
  const [showRecordPaymentModal, setShowRecordPaymentModal] = useState(false);
  const { eligibilityChecks, recheckEligibility, priorAuths, patientBalances } = useRcm();

  const clientCheck = eligibilityChecks.find(
    (c) =>
      (appointment.clientId && c.clientId === appointment.clientId) ||
      String(c.appointmentId) === String(appointment.id)
  );
  const elgStatus = clientCheck?.status || "pending";

  const clientAuth = priorAuths.find(
    (pa) => appointment.clientId && pa.clientId === appointment.clientId
  );

  const clientBalance = patientBalances.find(
    (pb) => appointment.clientId && pb.clientId === appointment.clientId
  );

  const formatDate = (date: string, time: string) => {
    const d = new Date(date + "T" + time);
    return d.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    }) + " at " + time;
  };

  const renderStars = (rating?: number) => {
    const stars = [];
    for (let i = 1; i <= 5; i++) {
      stars.push(
        <Star
          key={i}
          className="w-4 h-4"
          style={{
            color: i <= (rating || 0) ? "#F59E0B" : "#D1D5DB",
            fill: i <= (rating || 0) ? "#F59E0B" : "#D1D5DB",
          }}
        />
      );
    }
    return stars;
  };

  const getStatusDot = () => {
    if (appointment.status === "completed") {
      return (
        <div
          className="flex items-center justify-center"
          style={{
            width: "24px",
            height: "24px",
            borderRadius: "50%",
            backgroundColor: "#22C55E",
          }}
        >
          <Check className="w-3 h-3" style={{ color: "#FFFFFF" }} />
        </div>
      );
    }
    return (
      <div
        style={{
          width: "12px",
          height: "12px",
          borderRadius: "50%",
          backgroundColor: "#1A73E8",
        }}
      />
    );
  };

  const handleMenuAction = (action: string) => {
    setShowMenu(false);
    switch (action) {
      case "reschedule":
        onReschedule?.(appointment.id);
        break;
      case "complete":
        onMarkComplete?.(appointment.id);
        break;
      case "cancel":
        onCancel?.(appointment.id);
        break;
    }
  };

  return (
    <div
      style={{
        backgroundColor: "#FFFFFF",
        border: "1px solid #E5E7EB",
        borderRadius: "12px",
        padding: "16px",
        boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
        position: "relative",
      }}
    >
      {/* Row 1 - Client Info & Status */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-start gap-3">
          {/* Avatar with Badge */}
          <div className="relative">
            <div
              className="flex items-center justify-center"
              style={{
                width: "48px",
                height: "48px",
                borderRadius: "50%",
                backgroundColor: "#E5E7EB",
              }}
            >
              <User className="w-6 h-6" style={{ color: "#9CA3AF" }} />
            </div>
            {/* Video/Chat Badge */}
            <div
              className="absolute flex items-center justify-center"
              style={{
                width: "16px",
                height: "16px",
                borderRadius: "50%",
                backgroundColor: "#1A73E8",
                bottom: "0",
                left: "0",
              }}
            >
              <Video className="w-2.5 h-2.5" style={{ color: "#FFFFFF" }} />
            </div>
          </div>

          {/* Client Name, Provider Name, Service */}
          <div>
            <div
              style={{
                fontSize: "15px",
                fontWeight: "bold",
                color: "#111827",
                fontFamily: "DM Sans, sans-serif",
                marginBottom: "2px",
              }}
            >
              {appointment.clientName}
            </div>
            <div
              style={{
                fontSize: "13px",
                color: "#6B7280",
                fontFamily: "Outfit, sans-serif",
                marginBottom: "2px",
              }}
            >
              {employee?.name || "Unknown Provider"}
            </div>
            <div
              style={{
                fontSize: "13px",
                color: "#1A73E8",
                fontFamily: "Outfit, sans-serif",
              }}
            >
              {service?.name || "Unknown Service"}
            </div>
          </div>
        </div>

        {/* Status Dot & Eligibility Badge & Three-Dot Menu */}
        <div className="flex items-center gap-2">
          {/* Eligibility Badge */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowEligibilityPopover(!showEligibilityPopover)}
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold cursor-pointer transition-all hover:opacity-90 shadow-2xs"
              style={{
                fontFamily: "DM Sans, sans-serif",
                backgroundColor:
                  elgStatus === "active"
                    ? "#DCFCE7"
                    : elgStatus === "inactive" || elgStatus === "not_covered"
                    ? "#FEE2E2"
                    : elgStatus === "inconclusive"
                    ? "#FEF3C7"
                    : elgStatus === "self_pay"
                    ? "#E0E7FF"
                    : "#F1F5F9",
                color:
                  elgStatus === "active"
                    ? "#166534"
                    : elgStatus === "inactive" || elgStatus === "not_covered"
                    ? "#991B1B"
                    : elgStatus === "inconclusive"
                    ? "#92400E"
                    : elgStatus === "self_pay"
                    ? "#3730A3"
                    : "#475569",
                border: "1px solid rgba(0,0,0,0.06)",
              }}
              title="Insurance Coverage Status"
            >
              {elgStatus === "active" ? (
                <ShieldCheck className="w-3 h-3 text-emerald-600" />
              ) : elgStatus === "inconclusive" || elgStatus === "inactive" ? (
                <ShieldAlert className="w-3 h-3" />
              ) : (
                <Shield className="w-3 h-3" />
              )}
              <span>{elgStatus === "self_pay" ? "Self-Pay" : elgStatus.charAt(0).toUpperCase() + elgStatus.slice(1).replace("_", " ")}</span>
            </button>

            {/* Pre-Visit Prep Panel Popover */}
            {showEligibilityPopover && (
              <>
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => setShowEligibilityPopover(false)}
                />
                <div
                  className="absolute right-0 top-7 z-50 w-80 p-4 bg-white rounded-2xl shadow-2xl border border-slate-200 text-left space-y-3.5"
                  style={{ fontFamily: "DM Sans, sans-serif" }}
                >
                  {/* Header */}
                  <div className="flex items-center justify-between pb-2.5 border-b border-slate-100">
                    <div>
                      <span className="text-xs font-bold text-slate-900 block">Pre-Visit Prep Panel</span>
                      <span className="text-[10px] text-slate-400 font-mono">Patient: {appointment.clientName}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowEligibilityPopover(false)}
                      className="p-1 text-slate-400 hover:text-slate-600 rounded"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* Section 1: Eligibility Check */}
                  <div className="p-2.5 bg-slate-50/70 border border-slate-100 rounded-xl space-y-1.5 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                        Insurance Verification
                      </span>
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-semibold font-mono ${
                          elgStatus === "active"
                            ? "bg-emerald-100 text-emerald-800"
                            : elgStatus === "inconclusive"
                            ? "bg-amber-100 text-amber-800"
                            : elgStatus === "self_pay"
                            ? "bg-indigo-100 text-indigo-800"
                            : "bg-slate-100 text-slate-700"
                        }`}
                      >
                        {elgStatus === "self_pay" ? "Self Pay" : elgStatus}
                      </span>
                    </div>
                    <div className="text-slate-800 font-medium">
                      {clientCheck?.payerName || "No Insurance Assigned"}
                    </div>
                    {clientCheck?.memberId && (
                      <div className="text-[11px] font-mono text-slate-500">
                        ID: {clientCheck.memberId}
                      </div>
                    )}
                    {clientCheck?.copayAmount !== undefined && (
                      <div className="text-[11px] text-slate-600">
                        Copay: <strong className="font-mono text-slate-900">${clientCheck.copayAmount.toFixed(2)}</strong> • Ded: ${ (clientCheck.deductibleRemaining || 0).toFixed(2)}
                      </div>
                    )}
                    {clientCheck?.inconclusiveReason && (
                      <div className="p-1.5 bg-amber-50 border border-amber-200 rounded text-[10px] text-amber-800">
                        {clientCheck.inconclusiveReason}
                      </div>
                    )}
                    <button
                      type="button"
                      onClick={() => {
                        if (clientCheck) {
                          recheckEligibility(clientCheck.id);
                        } else {
                          toast.info("No policy on file to verify. Update client profile insurance.");
                        }
                      }}
                      className="w-full mt-1 flex items-center justify-center gap-1.5 px-2 py-1 bg-white border border-slate-200 hover:bg-slate-50 text-blue-600 rounded-lg text-[11px] font-semibold transition-colors"
                    >
                      <RefreshCw className="w-3 h-3" /> Re-run Verification
                    </button>
                  </div>

                  {/* Section 2: Prior Authorization Traffic-Light */}
                  <div className="p-2.5 bg-slate-50/70 border border-slate-100 rounded-xl space-y-1.5 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                        Prior Authorization
                      </span>
                      {clientAuth ? (
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            clientAuth.usedVisits >= clientAuth.authorizedVisits || clientAuth.status === "exhausted" || clientAuth.status === "expired"
                              ? "bg-rose-100 text-rose-800"
                              : clientAuth.authorizedVisits - clientAuth.usedVisits <= 2
                              ? "bg-amber-100 text-amber-800"
                              : "bg-emerald-100 text-emerald-800"
                          }`}
                        >
                          {clientAuth.usedVisits >= clientAuth.authorizedVisits
                            ? "Exhausted"
                            : `${clientAuth.authorizedVisits - clientAuth.usedVisits} left`}
                        </span>
                      ) : (
                        <span className="text-[10px] text-slate-400">None on file</span>
                      )}
                    </div>

                    {clientAuth ? (
                      <div className="space-y-1">
                        <div className="text-[11px] font-mono text-slate-700">
                          Auth: {clientAuth.authNumber}
                        </div>
                        <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full ${
                              clientAuth.usedVisits >= clientAuth.authorizedVisits
                                ? "bg-rose-500"
                                : clientAuth.authorizedVisits - clientAuth.usedVisits <= 2
                                ? "bg-amber-500"
                                : "bg-emerald-500"
                            }`}
                            style={{
                              width: `${Math.min(100, (clientAuth.usedVisits / clientAuth.authorizedVisits) * 100)}%`,
                            }}
                          />
                        </div>
                        <div className="flex justify-between text-[10px] text-slate-400">
                          <span>{clientAuth.usedVisits} of {clientAuth.authorizedVisits} visits used</span>
                          <span>Expires: {clientAuth.expirationDate}</span>
                        </div>
                      </div>
                    ) : (
                      <p className="text-[11px] text-slate-500">No prior authorization required or attached.</p>
                    )}
                  </div>

                  {/* Section 3: Patient Responsibility & Charge Now */}
                  <div className="p-2.5 bg-slate-50/70 border border-slate-100 rounded-xl space-y-2 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                        Outstanding Patient Balance
                      </span>
                      <span className="font-bold font-mono text-slate-900 text-sm">
                        ${(clientBalance?.totalBalance || 0).toFixed(2)}
                      </span>
                    </div>

                    {(clientBalance?.totalBalance || 0) > 0 ? (
                      <button
                        type="button"
                        onClick={() => {
                          setShowEligibilityPopover(false);
                          setShowRecordPaymentModal(true);
                        }}
                        className="w-full flex items-center justify-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors cursor-pointer"
                      >
                        <CreditCard className="w-3.5 h-3.5" /> Charge Now (${(clientBalance?.totalBalance || 0).toFixed(2)})
                      </button>
                    ) : (
                      <div className="text-[11px] text-emerald-700 flex items-center gap-1">
                        <Check className="w-3 h-3" /> No outstanding balance due
                      </div>
                    )}
                  </div>
                </div>
              </>
            )}
          </div>

          {getStatusDot()}
          <button
            onClick={() => setShowMenu(!showMenu)}
            className="hover:bg-gray-100 rounded transition-colors"
            style={{
              width: "24px",
              height: "24px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              border: "none",
              backgroundColor: "transparent",
              cursor: "pointer",
            }}
          >
            <MoreVertical className="w-4 h-4" style={{ color: "#9CA3AF" }} />
          </button>
        </div>
      </div>

      {/* Dropdown Menu */}
      {showMenu && (
        <>
          <div
            style={{
              position: "fixed",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              zIndex: 40,
            }}
            onClick={() => setShowMenu(false)}
          />
          <div
            style={{
              position: "absolute",
              top: "48px",
              right: "16px",
              width: "160px",
              backgroundColor: "#FFFFFF",
              border: "1px solid #E5E7EB",
              borderRadius: "8px",
              boxShadow: "0 4px 12px rgba(0,0,0,0.12)",
              zIndex: 50,
              overflow: "hidden",
            }}
          >
            <button
              onClick={() => handleMenuAction("reschedule")}
              className="w-full flex items-center gap-2 hover:bg-gray-50 transition-colors"
              style={{
                height: "36px",
                padding: "0 12px",
                border: "none",
                backgroundColor: "transparent",
                cursor: "pointer",
              }}
            >
              <CalendarIcon className="w-4 h-4" style={{ color: "#1A73E8" }} />
              <span style={{ fontSize: "13px", color: "#374151", fontFamily: "Outfit, sans-serif" }}>
                Reschedule
              </span>
            </button>

            <button
              onClick={() => handleMenuAction("complete")}
              className="w-full flex items-center gap-2 hover:bg-gray-50 transition-colors"
              style={{
                height: "36px",
                padding: "0 12px",
                border: "none",
                backgroundColor: "transparent",
                cursor: "pointer",
              }}
            >
              <Check className="w-4 h-4" style={{ color: "#22C55E" }} />
              <span style={{ fontSize: "13px", color: "#374151", fontFamily: "Outfit, sans-serif" }}>
                Mark Complete
              </span>
            </button>

            <button
              onClick={() => handleMenuAction("cancel")}
              className="w-full flex items-center gap-2 hover:bg-gray-50 transition-colors"
              style={{
                height: "36px",
                padding: "0 12px",
                border: "none",
                backgroundColor: "transparent",
                cursor: "pointer",
              }}
            >
              <Trash2 className="w-4 h-4" style={{ color: "#EF4444" }} />
              <span style={{ fontSize: "13px", color: "#374151", fontFamily: "Outfit, sans-serif" }}>
                Cancel
              </span>
            </button>
          </div>
        </>
      )}

      {/* Row 2 - Date & Duration */}
      <div className="flex items-center gap-4 mb-3">
        <div className="flex items-center gap-1.5">
          <Calendar className="w-3.5 h-3.5" style={{ color: "#6B7280" }} />
          <span
            style={{
              fontSize: "12px",
              color: "#6B7280",
              fontFamily: "Outfit, sans-serif",
            }}
          >
            {formatDate(appointment.date, appointment.time)}
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <Clock className="w-3.5 h-3.5" style={{ color: "#6B7280" }} />
          <span
            style={{
              fontSize: "12px",
              color: "#6B7280",
              fontFamily: "Outfit, sans-serif",
            }}
          >
            {appointment.duration} min
          </span>
        </div>
      </div>

      {/* Row 3 - Star Rating (completed only) */}
      {appointment.status === "completed" && (
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-0.5">{renderStars(appointment.rating)}</div>
          <span
            style={{
              fontSize: "12px",
              color: "#6B7280",
              fontFamily: "Outfit, sans-serif",
            }}
          >
            Session rated
          </span>
        </div>
      )}

      {/* Pending Accept Note */}
      {appointment.status === "pending-accept" && (
        <div
          style={{
            fontSize: "11px",
            color: "#9CA3AF",
            fontStyle: "italic",
            fontFamily: "Outfit, sans-serif",
            marginTop: "8px",
          }}
        >
          *Provider requested appointment accept to confirm
        </div>
      )}

      {showRecordPaymentModal && (
        <RecordPaymentModal
          isOpen={showRecordPaymentModal}
          onClose={() => setShowRecordPaymentModal(false)}
          clientId={appointment.clientId}
          clientName={appointment.clientName}
        />
      )}
    </div>
  );
}
