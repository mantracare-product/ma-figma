import React, { useState, useMemo } from "react";
import { CustomSideDrawer } from "../ui/drawer";
import {
  BenefitLine,
  DetailedEligibilityResponse,
  getDetailedEligibilityResponse,
  recordAppointmentEligibility,
  getEligibilityTermsForService,
} from "../../../lib/rcmStore";
import { Tooltip } from "../ui/Tooltip";
import {
  Shield,
  RefreshCw,
  GripVertical,
  CheckCircle2,
  AlertCircle,
  Clock,
  Phone,
  HelpCircle,
  Lock,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { toast } from "sonner";

export interface EligibilityDetailDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  appointmentId: string | number;
  clientId?: string;
  clientName?: string;
  serviceType?: string;
  dateOfService?: string;
  servicePrice?: number;
  payerName?: string;
  memberId?: string;
  onEligibilityUpdated?: (result: DetailedEligibilityResponse) => void;
}

export default function EligibilityDetailDrawer({
  isOpen,
  onClose,
  appointmentId,
  clientId,
  clientName,
  serviceType,
  dateOfService,
  servicePrice,
  payerName,
  memberId,
  onEligibilityUpdated,
}: EligibilityDetailDrawerProps) {
  const [isVerifying, setIsVerifying] = useState(false);
  const [errorBanner, setErrorBanner] = useState<string | null>(null);

  // Collapsible section toggles
  const [collapsedSections, setCollapsedSections] = useState<Record<string, boolean>>({});

  const toggleSection = (sec: string) => {
    setCollapsedSections((prev) => ({ ...prev, [sec]: !prev[sec] }));
  };

  // Structured response state
  const [eligibilityData, setEligibilityData] = useState<DetailedEligibilityResponse>(() => {
    return getDetailedEligibilityResponse({
      appointmentId,
      clientId,
      clientName,
      serviceName: serviceType,
      servicePrice,
      payerName,
      memberId,
      appointmentDate: dateOfService,
    });
  });

  // Re-generate if appointmentId changes
  React.useEffect(() => {
    if (appointmentId) {
      setEligibilityData(
        getDetailedEligibilityResponse({
          appointmentId,
          clientId,
          clientName,
          serviceName: serviceType,
          servicePrice,
          payerName,
          memberId,
          appointmentDate: dateOfService,
        })
      );
    }
  }, [appointmentId, serviceType, servicePrice, payerName, memberId, dateOfService]);

  // Re-check Eligibility action
  const handleRecheck = () => {
    setIsVerifying(true);
    setErrorBanner(null);

    setTimeout(() => {
      try {
        const refreshed = getDetailedEligibilityResponse({
          appointmentId,
          clientId,
          clientName,
          serviceName: serviceType,
          servicePrice,
          payerName,
          memberId,
          appointmentDate: dateOfService,
        });

        // Persist to RCM store & appointment session storage
        const terms = getEligibilityTermsForService(serviceType, servicePrice, payerName || refreshed.payerName);
        recordAppointmentEligibility({
          appointmentId,
          clientId: clientId || "",
          clientName: clientName || "Patient",
          appointmentDate: dateOfService || new Date().toISOString().split("T")[0],
          status: refreshed.status,
          payerName: refreshed.payerName,
          memberId: refreshed.memberId,
          serviceName: serviceType,
          servicePrice,
          copayAmount: terms.copayAmount,
          deductibleRemaining: terms.deductibleRemaining,
          coinsurance: terms.coinsurance,
        });

        try {
          const raw = sessionStorage.getItem("appointments_v1");
          if (raw) {
            const list = JSON.parse(raw);
            const updated = list.map((a: any) =>
              String(a.id) === String(appointmentId)
                ? {
                    ...a,
                    eligibility: refreshed.status,
                    eligibilityStatus: refreshed.status,
                    eligibilityCheck: {
                      status: refreshed.status,
                      payerName: refreshed.payerName,
                      memberId: refreshed.memberId,
                      copayAmount: terms.copayAmount,
                      deductibleRemaining: terms.deductibleRemaining,
                      coinsurance: terms.coinsurance,
                      checkedAt: refreshed.checkedAt,
                    },
                  }
                : a
            );
            sessionStorage.setItem("appointments_v1", JSON.stringify(updated));
          }
        } catch {
          /* noop */
        }

        setEligibilityData(refreshed);
        setIsVerifying(false);
        onEligibilityUpdated?.(refreshed);
        toast.success("270/271 inquiry refreshed with electronic clearinghouse");
      } catch (err: any) {
        setIsVerifying(false);
        setErrorBanner("Payer 271 response could not be verified. Clearinghouse timeout.");
        toast.error("Failed to re-check eligibility");
      }
    }, 700);
  };

  // Grouped benefit lines
  const groupedLines = useMemo(() => {
    const groups: Record<string, BenefitLine[]> = {
      Copay: [],
      Deductible: [],
      Coinsurance: [],
      "Out-of-Pocket Max": [],
      Limitations: [],
    };

    eligibilityData.benefitLines.forEach((line) => {
      if (groups[line.category]) {
        groups[line.category].push(line);
      }
    });

    return groups;
  }, [eligibilityData]);

  // Format currency
  const formatAmount = (line: BenefitLine) => {
    if (line.isDataMissing || (line.amount === undefined && line.percent === undefined && !line.quantity)) {
      return "Not reported";
    }
    if (line.amount !== undefined) {
      return `$${line.amount.toFixed(2)}`;
    }
    if (line.percent !== undefined) {
      return `${line.percent}%`;
    }
    if (line.quantity) {
      return `${line.quantity.value} ${line.quantity.unit} / ${line.quantity.per}`;
    }
    return "Not reported";
  };

  return (
    <CustomSideDrawer
      isOpen={isOpen}
      onClose={onClose}
      maxWidth="w-full sm:w-[38vw] sm:max-w-[560px] min-w-[370px]"
      title={
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#181e25] to-[#2c3e50] text-white flex items-center justify-center shadow-xs">
            <Shield className="w-4 h-4 text-blue-400" />
          </div>
          <div className="min-w-0">
            <h3
              className="text-base font-bold text-[#181e25] truncate"
              style={{ fontFamily: "Outfit, sans-serif" }}
            >
              Detailed Eligibility &amp; Benefits
            </h3>
            <p className="text-xs text-slate-500 font-mono">
              270/271 Inquiry • Appt #{appointmentId}
            </p>
          </div>
        </div>
      }
      footer={
        <div className="flex items-center justify-between gap-2 w-full pt-2">
          <div className="text-[11px] text-slate-500 font-mono">
            Transaction Ref: 271-{appointmentId}-{Date.now().toString().slice(-6)}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 transition-colors cursor-pointer"
            style={{ fontFamily: "Outfit, sans-serif" }}
          >
            Close
          </button>
        </div>
      }
    >
      <div className="space-y-5 py-2" style={{ fontFamily: "DM Sans, sans-serif" }}>
        {/* Error Banner */}
        {errorBanner && (
          <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl flex items-center justify-between text-xs text-rose-900">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{errorBanner}</span>
            </div>
            <button
              type="button"
              onClick={() => setErrorBanner(null)}
              className="text-rose-700 hover:text-rose-900 font-bold ml-2 text-sm"
            >
              ✕
            </button>
          </div>
        )}

        {/* ── CARD 1: POLICY & COVERAGE STATUS ── */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-white">
            <div className="flex items-center gap-2">
              <GripVertical className="w-3.5 h-3.5 text-slate-400" />
              <span
                className="text-xs font-bold text-slate-800 uppercase tracking-wider"
                style={{ fontFamily: "Outfit, sans-serif" }}
              >
                Coverage Status &amp; Policy
              </span>
            </div>
            <button
              type="button"
              disabled={isVerifying}
              onClick={handleRecheck}
              className="px-3.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold flex items-center gap-1.5 transition-all shadow-2xs cursor-pointer shrink-0 disabled:opacity-50"
              style={{ fontFamily: "Outfit, sans-serif" }}
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isVerifying ? "animate-spin" : ""}`} />
              <span>{isVerifying ? "Verifying..." : "Re-check Eligibility"}</span>
            </button>
          </div>

          <div className="p-4 space-y-3">
            {/* Coverage Status */}
            <div className="space-y-1.5">
              <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                <GripVertical className="w-3 h-3 text-slate-300" />
                <span>Coverage Status</span>
                <Tooltip text="The patient's current insurance active standing determining if claims will be accepted or rejected by the payer.">
                  <HelpCircle className="w-3 h-3 text-slate-400 hover:text-slate-600 cursor-help transition-colors" />
                </Tooltip>
              </div>
              <div className="bg-slate-50/70 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-medium text-slate-800 w-full flex items-center justify-between">
                <span className="font-bold text-slate-900 flex items-center gap-1.5" style={{ fontFamily: "Outfit, sans-serif" }}>
                  {eligibilityData.status === "active" ? (
                    <>
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 inline" />
                      <span>Active Coverage</span>
                    </>
                  ) : (
                    <>
                      <AlertCircle className="w-4 h-4 text-rose-600 inline" />
                      <span className="capitalize">{eligibilityData.status.replace("_", " ")}</span>
                    </>
                  )}
                </span>
                <span className="text-[11px] text-slate-500 font-mono">EB01 Code: 1</span>
              </div>
            </div>

            {/* Plan Name */}
            <div className="space-y-1.5">
              <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                <GripVertical className="w-3 h-3 text-slate-300" />
                <span>Plan Name &amp; Tier</span>
                <Tooltip text="Official benefit product description registered under the insurance group.">
                  <HelpCircle className="w-3 h-3 text-slate-400 hover:text-slate-600 cursor-help transition-colors" />
                </Tooltip>
              </div>
              <div className="bg-slate-50/70 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-medium text-slate-800 w-full flex items-center justify-between">
                <span className="font-bold text-slate-900 truncate max-w-[280px]" style={{ fontFamily: "Outfit, sans-serif" }}>
                  {eligibilityData.planName}
                </span>
                <span className="text-[11px] text-slate-500 font-mono">Commercial PPO</span>
              </div>
            </div>

            {/* Primary Payer */}
            <div className="space-y-1.5">
              <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                <GripVertical className="w-3 h-3 text-slate-300" />
                <span>Primary Payer / Clearinghouse</span>
                <Tooltip text="The main insurance payer billed first for services before secondary coverage or patient balance.">
                  <HelpCircle className="w-3 h-3 text-slate-400 hover:text-slate-600 cursor-help transition-colors" />
                </Tooltip>
              </div>
              <div className="bg-slate-50/70 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-medium text-slate-800 w-full flex items-center justify-between">
                <span className="font-bold text-slate-900" style={{ fontFamily: "Outfit, sans-serif" }}>
                  {eligibilityData.payerName}
                </span>
                <span className="text-[11px] text-slate-500 truncate max-w-[180px] text-right">
                  {eligibilityData.verifyingEntity}
                </span>
              </div>
            </div>

            {/* Member & Group ID */}
            <div className="grid grid-cols-2 gap-2.5">
              <div className="space-y-1.5">
                <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  <GripVertical className="w-3 h-3 text-slate-300" />
                  <span>Member Policy ID</span>
                  <Tooltip text="Unique subscriber identification number required on claims to route benefits to this patient.">
                    <HelpCircle className="w-3 h-3 text-slate-400 hover:text-slate-600 cursor-help transition-colors" />
                  </Tooltip>
                </div>
                <div className="bg-slate-50/70 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-medium text-slate-800 w-full flex items-center justify-between">
                  <span className="font-mono font-bold text-slate-900">{eligibilityData.memberId}</span>
                  <span className="text-[10px] text-slate-400 font-mono">NM1*IL</span>
                </div>
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  <GripVertical className="w-3 h-3 text-slate-300" />
                  <span>Group Number</span>
                  <Tooltip text="Employer or policy group ID linked to the patient's schedule of benefits.">
                    <HelpCircle className="w-3 h-3 text-slate-400 hover:text-slate-600 cursor-help transition-colors" />
                  </Tooltip>
                </div>
                <div className="bg-slate-50/70 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-medium text-slate-800 w-full flex items-center justify-between">
                  <span className="font-mono font-bold text-slate-900">{eligibilityData.groupNumber}</span>
                  <span className="text-[10px] text-slate-400 font-mono">REF*6P</span>
                </div>
              </div>
            </div>

            {/* Effective Dates */}
            <div className="space-y-1.5">
              <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                <GripVertical className="w-3 h-3 text-slate-300" />
                <span>Benefit Policy Term</span>
                <Tooltip text="Coverage validity dates returned in the EDI 271 DTP segment.">
                  <HelpCircle className="w-3 h-3 text-slate-400 hover:text-slate-600 cursor-help transition-colors" />
                </Tooltip>
              </div>
              <div className="bg-slate-50/70 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-medium text-slate-800 w-full flex items-center justify-between font-mono">
                <span className="text-slate-800">
                  {eligibilityData.policyEffectiveDate} &rarr; {eligibilityData.policyExpirationDate}
                </span>
                <span className="text-[11px] text-slate-500 font-sans">Calendar Year</span>
              </div>
            </div>
          </div>
        </div>

        {/* ── CARD 2: COPAY (EB01: B) ── */}
        {groupedLines.Copay.length > 0 && (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
            <div
              onClick={() => toggleSection("copay")}
              className="p-4 border-b border-slate-100 flex items-center justify-between bg-white cursor-pointer hover:bg-slate-50/50 transition-colors"
            >
              <div className="flex items-center gap-2">
                <GripVertical className="w-3.5 h-3.5 text-slate-400" />
                <span
                  className="text-xs font-bold text-slate-800 uppercase tracking-wider"
                  style={{ fontFamily: "Outfit, sans-serif" }}
                >
                  Copayment Schedule ({groupedLines.Copay.length})
                </span>
                <Tooltip text="A fixed amount the patient pays per visit, regardless of the total service cost.">
                  <HelpCircle className="w-3 h-3 text-slate-400 hover:text-slate-600 cursor-help transition-colors" />
                </Tooltip>
              </div>
              <div className="text-slate-400">
                {collapsedSections.copay ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
              </div>
            </div>

            {!collapsedSections.copay && (
              <div className="p-4 space-y-2.5 max-h-72 overflow-y-auto">
                {groupedLines.Copay.map((line, idx) => (
                  <div
                    key={`copay-${idx}`}
                    className="bg-slate-50/70 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-medium text-slate-800 w-full flex items-center justify-between"
                  >
                    <div>
                      <div className="font-bold text-slate-900 font-mono text-sm" style={{ fontFamily: "Outfit, sans-serif" }}>
                        {formatAmount(line)}
                      </div>
                      <div className="text-[10px] text-slate-500 mt-0.5">
                        {line.placeOfService || "All Places"} • {line.network === "in" ? "In-Network" : line.network === "out" ? "Out-of-Network" : "N/A"}
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="text-[11px] text-slate-600 block">
                        {line.timePeriod || "Per Visit"}
                      </span>
                      {line.procedures && line.procedures.length > 0 && (
                        <div className="flex gap-1 justify-end mt-1">
                          {line.procedures.map((p) => (
                            <span key={p} className="px-1.5 py-0.5 bg-blue-50 border border-blue-200 text-blue-700 rounded text-[9px] font-mono font-bold">
                              {p}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── CARD 3: DEDUCTIBLE (EB01: C) ── */}
        {groupedLines.Deductible.length > 0 && (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
            <div
              onClick={() => toggleSection("deductible")}
              className="p-4 border-b border-slate-100 flex items-center justify-between bg-white cursor-pointer hover:bg-slate-50/50 transition-colors"
            >
              <div className="flex items-center gap-2">
                <GripVertical className="w-3.5 h-3.5 text-slate-400" />
                <span
                  className="text-xs font-bold text-slate-800 uppercase tracking-wider"
                  style={{ fontFamily: "Outfit, sans-serif" }}
                >
                  Deductible Breakdown ({groupedLines.Deductible.length})
                </span>
                <Tooltip text="How much of the patient's annual deductible is still unmet — this amount is owed by the patient before insurance starts contributing, unless a copay applies instead.">
                  <HelpCircle className="w-3 h-3 text-slate-400 hover:text-slate-600 cursor-help transition-colors" />
                </Tooltip>
              </div>
              <div className="text-slate-400">
                {collapsedSections.deductible ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
              </div>
            </div>

            {!collapsedSections.deductible && (
              <div className="p-4 space-y-2.5 max-h-72 overflow-y-auto">
                {groupedLines.Deductible.map((line, idx) => (
                  <div
                    key={`ded-${idx}`}
                    className="bg-slate-50/70 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-medium text-slate-800 w-full flex items-center justify-between"
                  >
                    <div>
                      <div className="font-bold text-slate-900 font-mono text-sm" style={{ fontFamily: "Outfit, sans-serif" }}>
                        {formatAmount(line)}
                      </div>
                      <div className="text-[10px] text-slate-500 mt-0.5 capitalize">
                        {line.coverageLevel} • {line.network === "in" ? "In-Network" : "Out-of-Network"}
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="text-[11px] font-semibold text-slate-700 block">
                        {line.timePeriod === "Remaining" ? "Unmet Remaining" : "Calendar Year Limit"}
                      </span>
                      <span className="text-[10px] text-slate-400 font-mono">DTP*292</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── CARD 4: COINSURANCE (EB01: A) ── */}
        {groupedLines.Coinsurance.length > 0 && (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
            <div
              onClick={() => toggleSection("coinsurance")}
              className="p-4 border-b border-slate-100 flex items-center justify-between bg-white cursor-pointer hover:bg-slate-50/50 transition-colors"
            >
              <div className="flex items-center gap-2">
                <GripVertical className="w-3.5 h-3.5 text-slate-400" />
                <span
                  className="text-xs font-bold text-slate-800 uppercase tracking-wider"
                  style={{ fontFamily: "Outfit, sans-serif" }}
                >
                  Coinsurance Cost-Share ({groupedLines.Coinsurance.length})
                </span>
                <Tooltip text="The percentage of the remaining cost the patient owes after the deductible has been met.">
                  <HelpCircle className="w-3 h-3 text-slate-400 hover:text-slate-600 cursor-help transition-colors" />
                </Tooltip>
              </div>
              <div className="text-slate-400">
                {collapsedSections.coinsurance ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
              </div>
            </div>

            {!collapsedSections.coinsurance && (
              <div className="p-4 space-y-2.5 max-h-72 overflow-y-auto">
                {groupedLines.Coinsurance.map((line, idx) => (
                  <div
                    key={`coins-${idx}`}
                    className="bg-slate-50/70 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-medium text-slate-800 w-full flex items-center justify-between"
                  >
                    <div>
                      <div className="font-bold text-slate-900 font-mono text-sm" style={{ fontFamily: "Outfit, sans-serif" }}>
                        {formatAmount(line)}
                      </div>
                      <div className="text-[10px] text-slate-500 mt-0.5">
                        {line.placeOfService || "Office"} • {line.network === "in" ? "In-Network" : "Out-of-Network"}
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="text-[11px] text-slate-600 block">Patient Share</span>
                      <span className="text-[10px] text-slate-400 font-mono">
                        Payer: {line.percent !== undefined ? `${100 - line.percent}%` : "Not reported"}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── CARD 5: OUT-OF-POCKET MAXIMUM (EB01: G) ── */}
        {groupedLines["Out-of-Pocket Max"].length > 0 && (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
            <div
              onClick={() => toggleSection("oop")}
              className="p-4 border-b border-slate-100 flex items-center justify-between bg-white cursor-pointer hover:bg-slate-50/50 transition-colors"
            >
              <div className="flex items-center gap-2">
                <GripVertical className="w-3.5 h-3.5 text-slate-400" />
                <span
                  className="text-xs font-bold text-slate-800 uppercase tracking-wider"
                  style={{ fontFamily: "Outfit, sans-serif" }}
                >
                  Out-of-Pocket Maximum ({groupedLines["Out-of-Pocket Max"].length})
                </span>
                <Tooltip text="The maximum amount the patient can pay in a plan year before insurance pays 100% of covered benefits.">
                  <HelpCircle className="w-3 h-3 text-slate-400 hover:text-slate-600 cursor-help transition-colors" />
                </Tooltip>
              </div>
              <div className="text-slate-400">
                {collapsedSections.oop ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
              </div>
            </div>

            {!collapsedSections.oop && (
              <div className="p-4 space-y-2.5 max-h-72 overflow-y-auto">
                {groupedLines["Out-of-Pocket Max"].map((line, idx) => (
                  <div
                    key={`oop-${idx}`}
                    className="bg-slate-50/70 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-medium text-slate-800 w-full flex items-center justify-between"
                  >
                    <div>
                      <div className="font-bold text-slate-900 font-mono text-sm" style={{ fontFamily: "Outfit, sans-serif" }}>
                        {formatAmount(line)}
                      </div>
                      <div className="text-[10px] text-slate-500 mt-0.5 capitalize">
                        {line.coverageLevel} • In-Network
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="text-[11px] font-semibold text-slate-700 block">
                        {line.timePeriod === "Remaining" ? "Amount to Stop-Loss" : "Annual Out-of-Pocket Cap"}
                      </span>
                      <span className="text-[10px] text-slate-400 font-mono">EB01*G</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── CARD 6: ANNUAL / LIFETIME LIMITATIONS (EB01: F / H) ── */}
        {groupedLines.Limitations.length > 0 && (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
            <div
              onClick={() => toggleSection("limits")}
              className="p-4 border-b border-slate-100 flex items-center justify-between bg-white cursor-pointer hover:bg-slate-50/50 transition-colors"
            >
              <div className="flex items-center gap-2">
                <GripVertical className="w-3.5 h-3.5 text-slate-400" />
                <span
                  className="text-xs font-bold text-slate-800 uppercase tracking-wider"
                  style={{ fontFamily: "Outfit, sans-serif" }}
                >
                  Visit &amp; Frequency Limitations ({groupedLines.Limitations.length})
                </span>
                <Tooltip text="Caps on how many visits or services are covered within a calendar year or period.">
                  <HelpCircle className="w-3 h-3 text-slate-400 hover:text-slate-600 cursor-help transition-colors" />
                </Tooltip>
              </div>
              <div className="text-slate-400">
                {collapsedSections.limits ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
              </div>
            </div>

            {!collapsedSections.limits && (
              <div className="p-4 space-y-3 max-h-72 overflow-y-auto">
                {groupedLines.Limitations.map((line, idx) => {
                  const procList = line.procedures
                    ? line.procedures.flatMap((str) => str.split(";").map((p) => p.trim())).filter(Boolean)
                    : [];

                  return (
                    <div
                      key={`limit-${idx}`}
                      className="bg-slate-50/70 border border-slate-200 rounded-xl p-3 text-xs text-slate-800 space-y-2"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-slate-900" style={{ fontFamily: "Outfit, sans-serif" }}>
                          {line.serviceType}
                        </span>
                        <span className="px-2 py-0.5 bg-blue-100 text-blue-800 rounded font-semibold text-[11px] font-mono">
                          {formatAmount(line)}
                        </span>
                      </div>
                      {procList.length > 0 && (
                        <div className="flex flex-wrap items-center gap-1.5 pt-1">
                          <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">
                            Applicable CPTs:
                          </span>
                          {procList.map((cpt) => (
                            <span
                              key={cpt}
                              className="px-2 py-0.5 bg-white border border-slate-300 rounded font-mono text-[10px] font-bold text-slate-700 shadow-2xs"
                            >
                              {cpt}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ── CARD 7: NON-COVERED SERVICES (Only rendered if present) ── */}
        {eligibilityData.nonCoveredServices && eligibilityData.nonCoveredServices.length > 0 && (
          <div className="bg-white rounded-2xl border border-rose-200/80 shadow-2xs overflow-hidden">
            <div className="p-4 border-b border-rose-100 flex items-center justify-between bg-rose-50/40">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-600" />
                <span
                  className="text-xs font-bold text-rose-950 uppercase tracking-wider"
                  style={{ fontFamily: "Outfit, sans-serif" }}
                >
                  Explicit Exclusions / Non-Covered Services
                </span>
                <Tooltip text="Services explicitly excluded by the payer that will be denied and transfer to 100% patient responsibility.">
                  <HelpCircle className="w-3 h-3 text-rose-400 hover:text-rose-600 cursor-help transition-colors" />
                </Tooltip>
              </div>
            </div>

            <div className="p-4 space-y-2 bg-rose-50/20">
              {eligibilityData.nonCoveredServices.map((ex, idx) => (
                <div
                  key={`ex-${idx}`}
                  className="bg-white border border-rose-200 rounded-xl px-3.5 py-2 text-xs font-medium text-rose-900 flex items-center gap-2 shadow-2xs"
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-rose-500 shrink-0" />
                  <span>{ex}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── CARD 8: PRIOR AUTHORIZATION & CERTIFICATION ── */}
        {eligibilityData.priorAuth && (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-white">
              <div className="flex items-center gap-2">
                <Lock className="w-3.5 h-3.5 text-slate-400" />
                <span
                  className="text-xs font-bold text-slate-800 uppercase tracking-wider"
                  style={{ fontFamily: "Outfit, sans-serif" }}
                >
                  Prior Authorization &amp; Pre-Certification
                </span>
                <Tooltip text="Confirms the payer has pre-approved this specific service as medically necessary before the visit.">
                  <HelpCircle className="w-3 h-3 text-slate-400 hover:text-slate-600 cursor-help transition-colors" />
                </Tooltip>
              </div>
              <span
                className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold font-mono ${
                  eligibilityData.priorAuth.authNumber
                    ? "bg-emerald-100 text-emerald-800"
                    : eligibilityData.priorAuth.required
                    ? "bg-amber-100 text-amber-800"
                    : "bg-slate-100 text-slate-600"
                }`}
              >
                {eligibilityData.priorAuth.authNumber ? "Pre-Certified" : eligibilityData.priorAuth.required ? "Auth Required" : "Not Required"}
              </span>
            </div>

            <div className="p-4 space-y-3">
              {eligibilityData.priorAuth.authNumber && (
                <div className="bg-slate-50/70 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-medium text-slate-800 w-full flex items-center justify-between">
                  <span className="font-mono font-bold text-slate-900">{eligibilityData.priorAuth.authNumber}</span>
                  <span className="text-[11px] text-emerald-700 font-semibold">Verified Active</span>
                </div>
              )}
              {eligibilityData.priorAuth.note && (
                <p className="text-xs text-slate-600 leading-relaxed bg-slate-50/50 p-2.5 rounded-xl border border-slate-100">
                  {eligibilityData.priorAuth.note}
                </p>
              )}
            </div>
          </div>
        )}

        {/* ── CARD 9: RELATED CONTACTS ── */}
        {eligibilityData.contacts && eligibilityData.contacts.length > 0 && (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-white">
              <div className="flex items-center gap-2">
                <Phone className="w-3.5 h-3.5 text-slate-400" />
                <span
                  className="text-xs font-bold text-slate-800 uppercase tracking-wider"
                  style={{ fontFamily: "Outfit, sans-serif" }}
                >
                  Payer Inquiries &amp; Contacts ({eligibilityData.contacts.length})
                </span>
              </div>
            </div>

            <div className="p-4 space-y-2.5">
              {eligibilityData.contacts.map((c, idx) => (
                <div
                  key={`contact-${idx}`}
                  className="bg-slate-50/70 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-medium text-slate-800 w-full flex items-center justify-between"
                >
                  <span className="font-medium text-slate-800">{c.role}</span>
                  <span className="font-mono font-bold text-blue-600">{c.phone}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── AUDIT FOOTER ROW ── */}
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 flex items-center justify-between text-xs text-slate-500 font-mono">
          <div className="flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-slate-400" />
            <span>Verified: {new Date(eligibilityData.checkedAt).toLocaleString()}</span>
          </div>
          <span className="text-[10px] text-slate-400">EDI 271 Loop 2110C</span>
        </div>
      </div>
    </CustomSideDrawer>
  );
}
