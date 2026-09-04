import React, { useState, useMemo, useEffect } from "react";
import { CustomSideDrawer } from "../ui/drawer";
import CustomSelect from "../ui/CustomSelect";
import { FieldDefinition } from "../../context/FieldRegistryContext";
import { getStoredServices, onServicesChanged } from "../../../lib/servicesStore";
import { InvoiceLineItem } from "../../types/invoiceTypes";
import {
  ChevronDown, ChevronUp, Plus, Trash2, Receipt, User, CheckCircle2,
  Calendar, Stethoscope, ShieldCheck, RefreshCw, XCircle, AlertCircle,
  Clock, Check, ExternalLink, Sparkles, Building2, Info, Lock, GripVertical,
} from "lucide-react";
import { toast } from "sonner";
import { initialClients } from "../../pages/ClientProfile";
import { recordAppointmentEligibility } from "../../../lib/rcmStore";
import { getEligibilityBadge } from "../rcm/EligibilityBadge";
import { EligibilityCheck, EligibilityStatus } from "../../types/rcmTypes";
import AddInsuranceDrawer, { InsuranceFormValues } from "../profile/AddInsuranceDrawer";
import { getStoredInsuranceRecords, addStoredInsuranceRecord, ClientInsuranceRecord } from "../../../lib/insuranceStore";

export interface ClientOption {
  id: number | string;
  name: string;
  email: string;
  phone: string;
  specialty?: string;
  avatar?: string;
  availability?: string;
  status?: string;
  process?: string;
  responsiblePerson?: string;
}

export interface Employee {
  id: number | string;
  name: string;
  email: string;
}

export interface BookingFormValues {
  title: string;
  description: string;
  note: string;
  tags: string;
  processId: string;
  stageId: string;
  date: string;              // YYYY-MM-DD
  startHour: number;
  startMinute: number;
  sessionType: "video" | "inPerson";
  client: ClientOption | null;
  provider: Employee | null;
  serviceId?: string;
  serviceName?: string;
  generateInvoice?: boolean;
  lineItems?: InvoiceLineItem[];
  discountAmount?: number;
  eligibilityStatus?: "pending" | "active" | "inactive" | "inconclusive" | "self_pay";
  eligibilityPayer?: string;
  eligibilityCopay?: number;
  eligibilityDeductible?: number;
  // Insurance fields matching EHR specifications
  syncToCase?: boolean;
  primaryInsurance?: string;
  preCertification?: string;
  hasSecondaryInsurance?: boolean;
  secondaryInsurance?: string;
  location?: string;
}

export interface ScheduleAppointmentDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  mode: "create" | "reschedule";
  values: BookingFormValues;
  onChange: (patch: Partial<BookingFormValues>) => void;
  onSave: () => any | Promise<any>;             // = handleBookingComplete
  isSaving?: boolean;

  employees: Employee[];
  clients: ClientOption[];
  processStages: Record<string, string[]>;

  // Custom fields section
  customFields: FieldDefinition[];        // appointmentCustomFields (source === "custom")
  visibleCustomFieldKeys: string[];       // apptVisibleFieldKeys
  customFieldValues: Record<string, string>;
  onCustomFieldChange: (key: string, value: string) => void;
  onOpenSelectFields: () => void;         // opens SelectFieldsModal
  onOpenCreateField: () => void;          // opens CreateFieldModal
  onBookingSuccess?: (appointment: any) => void;
}

export default function ScheduleAppointmentDrawer({
  isOpen,
  onClose,
  mode,
  values,
  onChange,
  onSave,
  employees,
  clients,
  processStages,
  customFields,
  visibleCustomFieldKeys,
  customFieldValues,
  onCustomFieldChange,
  onOpenSelectFields,
  onOpenCreateField,
  onBookingSuccess,
  isSaving = false,
}: ScheduleAppointmentDrawerProps) {
  const [invoiceSectionExpanded, setInvoiceSectionExpanded] = useState(true);
  const [customFieldsExpanded, setCustomFieldsExpanded] = useState(true);
  const [insuranceExpanded, setInsuranceExpanded] = useState(false);
  const [additionalDetailsExpanded, setAdditionalDetailsExpanded] = useState(false);
  const [activeTab, setActiveTab] = useState<"details" | "service">("details");
  const [drawerStep, setDrawerStep] = useState<"form" | "confirmation">("form");
  const [bookedAppt, setBookedAppt] = useState<any | null>(null);
  const [isVerifyingEligibility, setIsVerifyingEligibility] = useState(false);
  const [eligibilityResult, setEligibilityResult] = useState<any | null>(null);
  const [selectedScenario, setSelectedScenario] = useState<string>("auto");
  const [isAddInsuranceOpen, setIsAddInsuranceOpen] = useState(false);
  const [insuranceRecords, setInsuranceRecords] = useState<ClientInsuranceRecord[]>(() =>
    getStoredInsuranceRecords(values.client?.id ? String(values.client.id) : undefined)
  );

  useEffect(() => {
    setInsuranceRecords(getStoredInsuranceRecords(values.client?.id ? String(values.client.id) : undefined));
  }, [values.client?.id]);

  useEffect(() => {
    if (isOpen) {
      setDrawerStep("form");
      setBookedAppt(null);
      setEligibilityResult(null);
      setActiveTab("details");
    }
  }, [isOpen]);

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
      return `${datePart}, ${h12}:${m} ${ampm}`;
    } catch { return datePart; }
  };

  const handleBookSubmit = async () => {
    if (mode === "reschedule") {
      onSave();
      return;
    }
    const created = await onSave();
    const hh = String(values.startHour).padStart(2, "0");
    const mm = String(values.startMinute).padStart(2, "0");
    const patientName = values.client?.name;
    const autoTitle = values.title?.trim()
      ? values.title.trim()
      : values.serviceName && patientName
      ? `${values.serviceName} — ${patientName}`
      : values.serviceName || values.title || "Initial Consultation";
    const apptData = created || {
      id: Date.now(),
      clientName: values.client?.name,
      clientId: values.client?.id,
      clientStatus: values.client?.status,
      employeeId: values.provider?.id,
      providerName: values.provider?.name,
      serviceName: values.serviceName || values.title || "Initial Consultation",
      service: values.serviceName || values.title || "Initial Consultation",
      title: autoTitle,
      date: values.date,
      time: `${hh}:${mm}`,
      sessionType: values.sessionType,
      location: values.location,
      status: "scheduled",
      eligibility: "active",
      eligibilityStatus: "active",
      primaryInsurance: values.primaryInsurance,
      secondaryInsurance: values.hasSecondaryInsurance ? values.secondaryInsurance : undefined,
      preCertification: values.preCertification || (values.serviceName || values.title ? "Pre-Authorized" : "Not Required"),
      syncToCase: values.syncToCase ?? true,
    };
    setBookedAppt(apptData);
    if (onBookingSuccess) {
      onBookingSuccess(apptData);
    } else {
      setDrawerStep("confirmation");
    }
  };

  const handleVerifyEligibilityInDrawer = (scenarioOverride?: string) => {
    if (!bookedAppt) return;
    setIsVerifyingEligibility(true);

    setTimeout(() => {
      const clientStatus = (bookedAppt.clientStatus || values.client?.status || "").toLowerCase();
      const clientName = (bookedAppt.clientName || values.client?.name || "").toLowerCase();
      const scenario = scenarioOverride || selectedScenario || "auto";

      let resolvedStatus: EligibilityStatus = "active";
      let resolvedPayer = "Blue Cross Blue Shield";
      let copay: number | undefined = 25;
      let deductible: number | undefined = 150;
      let coinsurance: number | undefined = 20;
      let terminationReason: string | undefined = undefined;
      let inconclusiveReason: string | undefined = undefined;
      let memberId = `BCBS-${Math.floor(10000000 + Math.random() * 90000000)}`;

      if (scenario === "inactive" || (scenario === "auto" && (clientStatus === "inactive" || clientName.includes("inactive") || clientName.includes("david martinez")))) {
        resolvedStatus = "inactive";
        resolvedPayer = "UnitedHealthcare";
        copay = undefined;
        deductible = undefined;
        coinsurance = undefined;
        terminationReason = "Policy terminated on 2026-01-31 (Benefit lapse / Non-payment)";
        memberId = "UHC-99201941";
      } else if (scenario === "not_covered" || (scenario === "auto" && (clientStatus === "not_covered" || clientName.includes("not covered")))) {
        resolvedStatus = "not_covered";
        resolvedPayer = "Cigna Healthcare";
        copay = undefined;
        deductible = undefined;
        coinsurance = undefined;
        terminationReason = "Service CPT code not covered under active behavioral health benefit rider";
        memberId = "CIG-44820194";
      } else if (scenario === "inconclusive" || (scenario === "auto" && (clientName.includes("michael chen") || clientName.includes("inconclusive")))) {
        resolvedStatus = "inconclusive";
        resolvedPayer = "Aetna Better Health";
        copay = undefined;
        deductible = undefined;
        coinsurance = undefined;
        inconclusiveReason = "Member ID format not recognized (expected 9 digits, got 8)";
        memberId = "AET-883011";
      } else if (scenario === "unable_to_respond" || (scenario === "auto" && (clientName.includes("timeout") || clientName.includes("error")))) {
        resolvedStatus = "unable_to_respond";
        resolvedPayer = "Clearinghouse Gateway";
        copay = undefined;
        deductible = undefined;
        coinsurance = undefined;
      } else {
        // active
        resolvedStatus = "active";
        resolvedPayer = "Blue Cross Blue Shield";
        copay = 25;
        deductible = 150;
        coinsurance = 20;
        memberId = "BCBS-84920194";
      }

      const resultPayload = {
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

      // 1. Persist to RCM Store
      recordAppointmentEligibility({
        appointmentId: bookedAppt.id,
        clientId: String(bookedAppt.clientId || values.client?.id || ""),
        clientName: bookedAppt.clientName || values.client?.name || "Patient",
        appointmentDate: bookedAppt.date,
        status: resolvedStatus,
        payerName: resolvedPayer,
        memberId,
        copayAmount: copay,
        deductibleRemaining: deductible,
        coinsurance,
        terminationReason,
        inconclusiveReason,
      });

      // 2. Persist to sessionStorage appointments_v1
      try {
        const stored = sessionStorage.getItem("appointments_v1");
        if (stored) {
          const all: any[] = JSON.parse(stored);
          const updated = all.map((a: any) =>
            String(a.id) === String(bookedAppt.id)
              ? {
                  ...a,
                  eligibility: resolvedStatus,
                  eligibilityStatus: resolvedStatus,
                  eligibilityCheck: resultPayload,
                }
              : a
          );
          sessionStorage.setItem("appointments_v1", JSON.stringify(updated));
        }
      } catch { /* noop */ }

      setEligibilityResult(resultPayload);
      setBookedAppt((prev: any) =>
        prev
          ? {
              ...prev,
              eligibility: resolvedStatus,
              eligibilityStatus: resolvedStatus,
              eligibilityCheck: resultPayload,
            }
          : null
      );
      setIsVerifyingEligibility(false);

      if (resolvedStatus === "active") {
        toast.success(`Eligibility verified: Active coverage confirmed with ${resolvedPayer} (Copay: $${copay})`);
      } else if (resolvedStatus === "inactive") {
        toast.error(`Eligibility check: Inactive coverage (${resolvedPayer})`);
      } else if (resolvedStatus === "not_covered") {
        toast.error(`Eligibility check: Service Not Covered (${resolvedPayer})`);
      } else if (resolvedStatus === "inconclusive") {
        toast.warning(`Eligibility check inconclusive: ${inconclusiveReason}`);
      } else {
        toast.error("Clearinghouse timed out. Unable to get a response from payer.");
      }
    }, 650);
  };

  const allAvailableClients: ClientOption[] = useMemo(() => {
    const list: ClientOption[] = [];
    const seenIds = new Set<string>();

    // 1. First add passed clients prop
    if (clients && clients.length > 0) {
      clients.forEach((c) => {
        const idKey = String(c.id);
        if (!seenIds.has(idKey)) {
          seenIds.add(idKey);
          list.push(c);
        }
      });
    }

    // 2. Load from sessionStorage and fallback initialClients
    try {
      const raw = sessionStorage.getItem("clients");
      const loaded = raw ? JSON.parse(raw) : initialClients;
      if (Array.isArray(loaded)) {
        loaded.forEach((c: any) => {
          const idKey = String(c.id);
          if (!seenIds.has(idKey)) {
            seenIds.add(idKey);
            list.push({
              id: c.id,
              name: c.name,
              email: c.email || "",
              phone: c.phone || "",
              status: c.status,
              process: Array.isArray(c.processes) ? c.processes[0] : c.processes,
              specialty: Array.isArray(c.processes) ? c.processes[0] : undefined,
              avatar: c.name?.split(" ").map((n: string) => n[0]).join("").toUpperCase().slice(0, 2),
            });
          }
        });
      }
    } catch {
      // ignore
    }

    // 3. Ensure selected client is always present
    if (values.client && !seenIds.has(String(values.client.id))) {
      list.unshift(values.client);
    }

    return list.sort((a, b) => (a.name || "").localeCompare(b.name || ""));
  }, [clients, values.client]);

  const isSections1to3Complete = !!(
    values.provider &&
    values.client &&
    (values.serviceId || values.serviceName || values.title?.trim()) &&
    values.date
  );
  const isValid = isSections1to3Complete;
  const endHour = (values.startHour + 1) % 24;
  const endMin = values.startMinute;
  const startHHMM = `${String(values.startHour).padStart(2, "0")}:${String(values.startMinute).padStart(2, "0")}`;
  const endHHMM = `${String(endHour).padStart(2, "0")}:${String(endMin).padStart(2, "0")}`;

  const appointmentSummary = useMemo(() => {
    if (!isSections1to3Complete || !values.date) return "";
    const sessionLabel = values.sessionType === "video" ? "Video visit" : "In-Person visit";
    let formattedDate = values.date;
    try {
      const parts = values.date.split("-");
      if (parts.length === 3) {
        const d = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
        formattedDate = d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
      }
    } catch { /* noop */ }
    const s12 = values.startHour % 12 || 12;
    const sAmPm = values.startHour >= 12 ? "PM" : "AM";
    const e12 = endHour % 12 || 12;
    const eAmPm = endHour >= 12 ? "PM" : "AM";
    const timeStr = `${s12}:${String(values.startMinute).padStart(2, "0")}–${e12}:${String(endMin).padStart(2, "0")} ${eAmPm}`;
    const providerName = values.provider?.name || "Provider";
    const clientName = values.client?.name || "Patient";
    return `${sessionLabel} · ${formattedDate} · ${timeStr} · ${providerName} with ${clientName}`;
  }, [isSections1to3Complete, values.date, values.sessionType, values.startHour, values.startMinute, endHour, endMin, values.provider, values.client]);

  const fmtDate = (hhmm: string) => {
    if (!values.date) return "";
    const d = new Date(`${values.date}T${hhmm}`);
    return (
      d.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" }) +
      " at " +
      d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })
    );
  };

  const [servicesVersion, setServicesVersion] = useState(0);

  useEffect(() => {
    return onServicesChanged(() => setServicesVersion((v) => v + 1));
  }, []);

  const allAvailableServices = useMemo(() => {
    const list: Array<{ id: string; name: string; price: number; duration: number; tax?: number }> = [];
    const seenNames = new Set<string>();

    try {
      const stored = getStoredServices();
      if (Array.isArray(stored)) {
        stored
          .filter((s) => s.isActive !== false && s.isActive === true)
          .forEach((s) => {
            if (!seenNames.has(s.name.toLowerCase())) {
              seenNames.add(s.name.toLowerCase());
              list.push({
                id: String(s.id),
                name: s.name,
                price: s.price,
                duration: s.duration || 30,
                tax: s.tax || 0,
              });
            }
          });
      }
    } catch { /* ignore */ }

    return list;
  }, [servicesVersion]);

  const handleServiceSelect = (serviceId: string) => {
    const srv = allAvailableServices.find((s) => String(s.id) === String(serviceId));
    if (srv) {
      const newLineItem: InvoiceLineItem = {
        id: `li-${Date.now()}`,
        source: "service",
        serviceId: String(srv.id),
        description: srv.name,
        quantity: 1,
        unitPrice: srv.price,
        taxPercent: srv.tax || 0,
      };

      const patientName = values.client?.name;
      const autoTitle = patientName ? `${srv.name} — ${patientName}` : `${srv.name} Appointment`;

      onChange({
        serviceId: String(srv.id),
        serviceName: srv.name,
        title: autoTitle,
        generateInvoice: values.generateInvoice ?? true,
        lineItems: [newLineItem],
        preCertification: "Pre-Authorized",
      });
    } else {
      onChange({ serviceId: "", serviceName: "", lineItems: [], preCertification: "Not Required" });
    }
  };

  const handleAddManualLineItem = () => {
    const newLineItem: InvoiceLineItem = {
      id: `li-${Date.now()}`,
      source: "manual",
      description: "Additional Consultation / Service",
      quantity: 1,
      unitPrice: 50,
      taxPercent: 0,
    };
    const current = values.lineItems || [];
    onChange({ lineItems: [...current, newLineItem] });
  };

  const handleUpdateLineItem = (index: number, patch: Partial<InvoiceLineItem>) => {
    const current = [...(values.lineItems || [])];
    if (current[index]) {
      current[index] = { ...current[index], ...patch };
      onChange({ lineItems: current });
    }
  };

  const handleRemoveLineItem = (index: number) => {
    const current = [...(values.lineItems || [])];
    current.splice(index, 1);
    onChange({ lineItems: current });
  };

  // Computations for invoice summary
  const currentLineItems = values.lineItems || [];
  const subtotal = currentLineItems.reduce((sum, item) => sum + (item.unitPrice * item.quantity - (item.discountAmount || 0)), 0);
  const discount = values.discountAmount || 0;
  const taxSum = currentLineItems.reduce((acc, item) => {
    const itemSub = Math.max(0, item.unitPrice * item.quantity - (item.discountAmount || 0));
    const effectiveDisc = subtotal > 0 ? (discount * (itemSub / subtotal)) : 0;
    const taxableItem = Math.max(0, itemSub - effectiveDisc);
    const taxRate = item.taxPercent !== undefined ? item.taxPercent : 0;
    return acc + (taxableItem * taxRate) / 100;
  }, 0);
  const tax = Math.round(taxSum * 100) / 100;
  const total = Math.round((Math.max(0, subtotal - discount) + tax) * 100) / 100;

  const inputCls =
    "w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-white shadow-2xs hover:border-slate-300 transition-colors";
  const labelCls = "block text-xs font-semibold text-slate-700 mb-1 font-sans";

  return (
    <>
      <CustomSideDrawer
        isOpen={isOpen}
      onClose={onClose}
      maxWidth="w-full sm:w-[30vw] sm:max-w-[30vw] min-w-[340px]"
      title={
        drawerStep === "confirmation" ? (
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600 shadow-2xs">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xl font-bold text-gray-900" style={{ fontFamily: "Outfit, sans-serif" }}>
                Appointment Booked
              </p>
              <p className="text-xs text-slate-500 mt-0.5" style={{ fontFamily: "Outfit, sans-serif" }}>
                Encounter has been recorded. Review details and verify patient insurance coverage below.
              </p>
            </div>
          </div>
        ) : (
          <div>
            <p className="text-xl font-bold text-gray-900" style={{ fontFamily: "Outfit, sans-serif" }}>
              {mode === "reschedule" ? "Reschedule Appointment" : "Schedule Appointment"}
            </p>
            <p className="text-xs text-slate-500 mt-0.5" style={{ fontFamily: "Outfit, sans-serif" }}>
              {mode === "reschedule"
                ? "Update the date and time for this appointment"
                : "Create a new appointment with a client"}
            </p>
          </div>
        )
      }
      footer={
        drawerStep === "confirmation" ? (
          <div className="flex items-center justify-end w-full">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-2.5 rounded-xl font-semibold text-xs text-white bg-[#181e25] hover:bg-slate-800 transition-all shadow-xs cursor-pointer flex items-center gap-1.5"
              style={{ fontFamily: "Outfit, sans-serif" }}
            >
              <Check className="w-3.5 h-3.5" /> Done
            </button>
          </div>
        ) : (
          <div className="flex flex-col gap-2.5 w-full">
            {/* One-line summary once Sections 1–3 are complete */}
            {isSections1to3Complete && appointmentSummary && (
              <div className="w-full py-2 px-3 bg-slate-50 border border-slate-200/80 rounded-xl text-[11px] text-slate-700 font-medium flex items-center gap-2 select-none truncate animate-in fade-in">
                <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
                <span className="truncate">{appointmentSummary}</span>
              </div>
            )}

            <div className="flex items-center justify-end gap-3 w-full">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition-all cursor-pointer"
                style={{ fontFamily: "Outfit, sans-serif" }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleBookSubmit}
                disabled={!isSections1to3Complete || isSaving}
                className="px-6 py-2.5 rounded-xl font-semibold text-xs transition-all shadow-2xs flex items-center justify-center gap-1.5"
                style={{
                  fontFamily: "Outfit, sans-serif",
                  backgroundColor: isSections1to3Complete && !isSaving ? "#181e25" : "#E5E7EB",
                  color: isSections1to3Complete && !isSaving ? "#ffffff" : "#9CA3AF",
                  cursor: isSections1to3Complete && !isSaving ? "pointer" : "not-allowed",
                  border: "none",
                }}
              >
                {isSaving ? "Saving..." : mode === "reschedule" ? "Save Changes" : "Book Appointment"}
              </button>
            </div>
          </div>
        )
      }
    >
      {drawerStep === "confirmation" ? (
        <div className="space-y-6 animate-in fade-in slide-in-from-right-2 duration-300">
          {/* Summary Tiles */}
          <div>
            <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3" style={{ fontFamily: "Outfit, sans-serif" }}>
              Appointment Summary
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {/* Client */}
              <div className="bg-slate-50/90 rounded-xl p-3.5 border border-slate-200/80 shadow-2xs">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                  Client
                </span>
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-full bg-slate-200 flex items-center justify-center text-slate-700 font-bold text-[10px]">
                    {(bookedAppt?.clientName || values.client?.name || "C")[0]}
                  </div>
                  <span className="text-xs font-bold text-slate-800 truncate" style={{ fontFamily: "Outfit, sans-serif" }}>
                    {bookedAppt?.clientName || values.client?.name}
                  </span>
                </div>
              </div>

              {/* Provider */}
              <div className="bg-slate-50/90 rounded-xl p-3.5 border border-slate-200/80 shadow-2xs">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                  Provider
                </span>
                <div className="flex items-center gap-2">
                  <User className="w-4 h-4 text-blue-600 shrink-0" />
                  <span className="text-xs font-bold text-slate-800 truncate" style={{ fontFamily: "Outfit, sans-serif" }}>
                    {bookedAppt?.providerName || values.provider?.name || "Assigned Provider"}
                  </span>
                </div>
              </div>

              {/* Date & Time */}
              <div className="bg-slate-50/90 rounded-xl p-3.5 border border-slate-200/80 shadow-2xs">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                  Date &amp; Time
                </span>
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span className="text-xs font-bold text-slate-800 truncate" style={{ fontFamily: "Outfit, sans-serif" }}>
                    {formatDateTime(bookedAppt?.date || values.date, bookedAppt?.time || `${values.startHour}:${values.startMinute}`)}
                  </span>
                </div>
              </div>

              {/* Service */}
              <div className="bg-slate-50/90 rounded-xl p-3.5 border border-slate-200/80 shadow-2xs">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                  Service / Product
                </span>
                <div className="flex items-center gap-2">
                  <Stethoscope className="w-4 h-4 text-indigo-600 shrink-0" />
                  <span className="text-xs font-bold text-slate-800 truncate" style={{ fontFamily: "Outfit, sans-serif" }}>
                    {bookedAppt?.serviceName || bookedAppt?.service || values.serviceName || values.title || "Initial Consultation"}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Athelas Real-Time Eligibility Section */}
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-600 shadow-2xs">
                  <ShieldCheck className="w-4 h-4" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-bold text-slate-900" style={{ fontFamily: "Outfit, sans-serif" }}>
                      Real-Time Eligibility Verification
                    </h3>
                    <span className="px-2 py-0.5 rounded-md bg-slate-100 border border-slate-200 text-[10px] font-semibold text-slate-600">
                      EDI 270/271 Engine
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500" style={{ fontFamily: "Outfit, sans-serif" }}>
                    Athelas clearinghouse adjudication for patient copay, coinsurance &amp; active coverage status.
                  </p>
                </div>
              </div>

              {/* Live Badge */}
              <div className="shrink-0">
                {getEligibilityBadge(
                  eligibilityResult?.status || bookedAppt?.eligibility || "pending",
                  eligibilityResult || { payerName: "Pending Verification" }
                )}
              </div>
            </div>

            {/* Action Bar & Scenario Picker */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 bg-slate-50/80 rounded-xl border border-slate-200/70">
              <div className="flex items-center gap-2 flex-wrap flex-1 min-w-[280px]">
                <span className="text-xs font-semibold text-slate-700 whitespace-nowrap" style={{ fontFamily: "Outfit, sans-serif" }}>
                  Adjudication Scenario:
                </span>
                <div className="flex-1 min-w-[240px]">
                  <CustomSelect
                    value={selectedScenario}
                    onChange={(val) => setSelectedScenario(val)}
                    placeholder="Auto-detect from Client Record"
                    options={[
                      { value: "auto", label: "Auto-detect from Client Record" },
                      { value: "active", label: "Active", sublabel: "BCBS • Copay $25 • Deductible $150 • 20% Coinsurance" },
                      { value: "inactive", label: "Inactive", sublabel: "UnitedHealthcare • Lapsed 2026-01-31" },
                      { value: "not_covered", label: "Not Covered", sublabel: "Cigna • Behavioral Health Rider Missing" },
                      { value: "inconclusive", label: "Inconclusive", sublabel: "Aetna • Member ID Format Mismatch" },
                      { value: "unable_to_respond", label: "Unable to respond", sublabel: "Gateway Timeout" },
                    ]}
                  />
                </div>
              </div>

              <button
                type="button"
                onClick={() => handleVerifyEligibilityInDrawer()}
                disabled={isVerifyingEligibility}
                className="py-2 px-4 rounded-xl text-xs font-bold transition-all shadow-xs flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed bg-blue-600 hover:bg-blue-700 text-white whitespace-nowrap"
                style={{ fontFamily: "Outfit, sans-serif" }}
              >
                {isVerifyingEligibility ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin text-white" />
                    <span>Querying 270/271 Clearinghouse...</span>
                  </>
                ) : eligibilityResult ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 text-white" />
                    <span>Re-check Eligibility</span>
                  </>
                ) : (
                  <>
                    <ShieldCheck className="w-3.5 h-3.5 text-white" />
                    <span>Check Eligibility</span>
                  </>
                )}
              </button>
            </div>

            {/* Results Details Card */}
            {eligibilityResult ? (
              <div className="space-y-3 pt-1">
                {eligibilityResult.status === "active" && (
                  <div className="bg-emerald-50/70 border border-emerald-200 rounded-xl p-4 space-y-3">
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2 text-emerald-800 font-bold">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                        <span>Coverage Confirmed Active with {eligibilityResult.payerName}</span>
                      </div>
                      <span className="font-mono text-[11px] text-emerald-700 bg-emerald-100/80 px-2 py-0.5 rounded">
                        Member ID: {eligibilityResult.memberId}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-1">
                      <div className="bg-white/80 rounded-lg p-2.5 border border-emerald-200/80 text-center">
                        <span className="text-[10px] text-slate-500 uppercase font-semibold block">Copay</span>
                        <span className="text-sm font-bold text-slate-800 font-mono">${eligibilityResult.copayAmount}.00</span>
                      </div>
                      <div className="bg-white/80 rounded-lg p-2.5 border border-emerald-200/80 text-center">
                        <span className="text-[10px] text-slate-500 uppercase font-semibold block">Deductible Rem.</span>
                        <span className="text-sm font-bold text-slate-800 font-mono">${eligibilityResult.deductibleRemaining}.00</span>
                      </div>
                      <div className="bg-white/80 rounded-lg p-2.5 border border-emerald-200/80 text-center">
                        <span className="text-[10px] text-slate-500 uppercase font-semibold block">Coinsurance</span>
                        <span className="text-sm font-bold text-slate-800 font-mono">{eligibilityResult.coinsurance}%</span>
                      </div>
                      <div className="bg-white/80 rounded-lg p-2.5 border border-emerald-200/80 text-center">
                        <span className="text-[10px] text-slate-500 uppercase font-semibold block">Network Status</span>
                        <span className="text-xs font-bold text-emerald-700">In-Network</span>
                      </div>
                    </div>

                    <p className="text-[11px] text-emerald-800/90 font-medium">
                      ✓ Service is pre-authorized for outpatient consultation. Patient responsibility will default to ${eligibilityResult.copayAmount}.00 at check-in.
                    </p>
                  </div>
                )}

                {eligibilityResult.status === "inactive" && (
                  <div className="bg-rose-50/70 border border-rose-200 rounded-xl p-4 space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2 text-rose-800 font-bold">
                        <XCircle className="w-4 h-4 text-rose-600" />
                        <span>Coverage Inactive / Terminated ({eligibilityResult.payerName})</span>
                      </div>
                      <span className="font-mono text-[11px] text-rose-700 bg-rose-100/80 px-2 py-0.5 rounded">
                        Member ID: {eligibilityResult.memberId}
                      </span>
                    </div>
                    <p className="text-xs text-rose-700 font-medium">
                      <strong>Payer Response:</strong> {eligibilityResult.terminationReason}
                    </p>
                    <p className="text-[11px] text-slate-600 bg-white/70 p-2.5 rounded-lg border border-rose-200/60">
                      <strong>Recommended Action:</strong> Request updated insurance card and primary policy details from patient or enroll in standard Self-Pay fee schedule.
                    </p>
                  </div>
                )}

                {eligibilityResult.status === "not_covered" && (
                  <div className="bg-rose-50/70 border border-rose-200 rounded-xl p-4 space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2 text-rose-800 font-bold">
                        <XCircle className="w-4 h-4 text-rose-600" />
                        <span>Service Not Covered ({eligibilityResult.payerName})</span>
                      </div>
                      <span className="font-mono text-[11px] text-rose-700 bg-rose-100/80 px-2 py-0.5 rounded">
                        Member ID: {eligibilityResult.memberId}
                      </span>
                    </div>
                    <p className="text-xs text-rose-700 font-medium">
                      <strong>Payer Response:</strong> {eligibilityResult.terminationReason}
                    </p>
                    <p className="text-[11px] text-slate-600 bg-white/70 p-2.5 rounded-lg border border-rose-200/60">
                      <strong>Recommended Action:</strong> Service CPT code is excluded under this policy. Obtain signed Advance Beneficiary Notice (ABN) prior to rendering treatment.
                    </p>
                  </div>
                )}

                {eligibilityResult.status === "inconclusive" && (
                  <div className="bg-amber-50/70 border border-amber-200 rounded-xl p-4 space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2 text-amber-900 font-bold">
                        <Clock className="w-4 h-4 text-amber-600" />
                        <span>Inconclusive Clearance ({eligibilityResult.payerName})</span>
                      </div>
                      <span className="font-mono text-[11px] text-amber-800 bg-amber-100/80 px-2 py-0.5 rounded">
                        Member ID: {eligibilityResult.memberId}
                      </span>
                    </div>
                    <p className="text-xs text-amber-800 font-medium">
                      <strong>Clearinghouse Reason:</strong> {eligibilityResult.inconclusiveReason}
                    </p>
                    <p className="text-[11px] text-slate-600 bg-white/70 p-2.5 rounded-lg border border-amber-200/60">
                      <strong>Recommended Action:</strong> Double check spelling of patient legal name, date of birth, and complete subscriber member ID before re-submitting 270 inquiry.
                    </p>
                  </div>
                )}

                {eligibilityResult.status === "unable_to_respond" && (
                  <div className="bg-slate-50 border border-slate-300 rounded-xl p-4 space-y-2">
                    <div className="flex items-center gap-2 text-slate-800 font-bold text-xs">
                      <AlertCircle className="w-4 h-4 text-slate-500" />
                      <span>Unable to Get a Response from Clearinghouse Gateway</span>
                    </div>
                    <p className="text-xs text-slate-600 font-medium">
                      Payer clearinghouse 270/271 gateway connection timed out or payer's real-time service is undergoing scheduled maintenance.
                    </p>
                    <p className="text-[11px] text-slate-500 bg-white p-2.5 rounded-lg border border-slate-200">
                      <strong>Recommended Action:</strong> Click "Re-check Eligibility" above to retry request, or verify coverage manually through the payer portal.
                    </p>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-5 bg-slate-50/60 rounded-xl border border-dashed border-slate-200 p-4">
                <Clock className="w-6 h-6 text-slate-400 mx-auto mb-1.5" />
                <p className="text-xs font-semibold text-slate-700" style={{ fontFamily: "Outfit, sans-serif" }}>
                  Pending Verification
                </p>
                <p className="text-[11px] text-slate-500 mt-0.5" style={{ fontFamily: "Outfit, sans-serif" }}>
                  Click "Check Eligibility" above to run an automated EDI 270/271 clearinghouse inquiry for this appointment.
                </p>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="space-y-4 pb-6" style={{ fontFamily: "DM Sans, sans-serif" }}>
          {/* ── SECTION 1: PARTICIPANTS ── */}
          <div id="section-participants" className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
            {/* Section Header */}
            <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-white">
              <div className="flex items-center gap-2">
                <GripVertical className="w-3.5 h-3.5 text-slate-400" />
                <span
                  className="text-xs font-bold text-slate-800 uppercase tracking-wider"
                  style={{ fontFamily: "Outfit, sans-serif" }}
                >
                  Participants
                </span>
              </div>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold font-mono uppercase tracking-wider bg-blue-50 text-blue-700 border border-blue-200/60">
                Step 1 of 4
              </span>
            </div>

            {/* Section Body */}
            <div className="p-4 space-y-3.5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider select-none">
                    <GripVertical className="w-3 h-3 text-slate-300" />
                    <span>Schedule For <span className="text-red-500">*</span></span>
                  </div>
                  <CustomSelect
                    value={values.provider?.id ? String(values.provider.id) : ""}
                    onChange={(val) => {
                      const emp = employees.find((x) => String(x.id) === String(val));
                      onChange({ provider: emp || null });
                    }}
                    placeholder="Select a user"
                    options={[
                      { value: "", label: "Select a user" },
                      ...employees.map((emp) => ({
                        value: String(emp.id),
                        label: emp.name,
                      })),
                    ]}
                  />
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider select-none">
                    <GripVertical className="w-3 h-3 text-slate-300" />
                    <span>Schedule With <span className="text-red-500">*</span></span>
                  </div>
                  <CustomSelect
                    value={values.client?.id ? String(values.client.id) : ""}
                    onChange={(val) => {
                      const cl = allAvailableClients.find((x) => String(x.id) === String(val));
                      const newTitle = cl && values.serviceName
                        ? `${values.serviceName} — ${cl.name}`
                        : values.title;
                      onChange({
                        client: cl || null,
                        ...(newTitle ? { title: newTitle } : {}),
                      });
                    }}
                    placeholder={`Select a client (${allAvailableClients.length} available)`}
                    searchable={allAvailableClients.length > 5}
                    options={[
                      { value: "", label: `Select a client (${allAvailableClients.length} available)` },
                      ...allAvailableClients.map((cl) => ({
                        value: String(cl.id),
                        label: cl.name,
                        sublabel: cl.phone || cl.email || undefined,
                      })),
                    ]}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* ── SECTION 2: SERVICE ── */}
          <div id="section-service" className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
            {/* Section Header */}
            <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-white">
              <div className="flex items-center gap-2">
                <GripVertical className="w-3.5 h-3.5 text-slate-400" />
                <span
                  className="text-xs font-bold text-slate-800 uppercase tracking-wider"
                  style={{ fontFamily: "Outfit, sans-serif" }}
                >
                  Service &amp; Procedure
                </span>
              </div>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold font-mono uppercase tracking-wider bg-blue-50 text-blue-700 border border-blue-200/60">
                Step 2 of 4
              </span>
            </div>

            {/* Section Body */}
            <div className="p-4 space-y-3.5">
              <div className="space-y-1.5">
                <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider select-none">
                  <GripVertical className="w-3 h-3 text-slate-300" />
                  <span>Select Service</span>
                </div>
                <CustomSelect
                  value={values.serviceId || ""}
                  onChange={(val) => handleServiceSelect(val)}
                  placeholder="Select a service (optional)"
                  searchable={allAvailableServices.length > 5}
                  options={[
                    { value: "", label: "Select a service (optional)" },
                    ...allAvailableServices.map((srv) => ({
                      value: srv.id,
                      label: srv.name,
                      sublabel: `$${srv.price} · ${srv.duration} mins`,
                    })),
                  ]}
                />
                {values.serviceName && (
                  <div className="bg-slate-50/70 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs flex items-center justify-between mt-2">
                    <span className="text-slate-500">Auto-formatted Title:</span>
                    <span className="font-bold text-slate-900" style={{ fontFamily: "Outfit, sans-serif" }}>
                      {values.title || `${values.serviceName} — ${values.client?.name || "Patient"}`}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* ── SECTION 3: SCHEDULE ── */}
          <div id="section-schedule" className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
            {/* Section Header */}
            <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-white">
              <div className="flex items-center gap-2">
                <GripVertical className="w-3.5 h-3.5 text-slate-400" />
                <span
                  className="text-xs font-bold text-slate-800 uppercase tracking-wider"
                  style={{ fontFamily: "Outfit, sans-serif" }}
                >
                  Schedule &amp; Session
                </span>
              </div>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold font-mono uppercase tracking-wider bg-blue-50 text-blue-700 border border-blue-200/60">
                Step 3 of 4
              </span>
            </div>

            {/* Section Body */}
            <div className="p-4 space-y-3.5">
              {/* Date */}
              <div className="space-y-1.5">
                <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider select-none">
                  <GripVertical className="w-3 h-3 text-slate-300" />
                  <span>Date <span className="text-red-500">*</span></span>
                </div>
                <input
                  type="date"
                  value={values.date}
                  onChange={(e) => onChange({ date: e.target.value })}
                  className={inputCls}
                  style={{ fontFamily: "Outfit, sans-serif" }}
                />
              </div>

              {/* Times in client timezone */}
              <div className="space-y-1.5">
                <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider select-none">
                  <GripVertical className="w-3 h-3 text-slate-300" />
                  <span>Times in Client Timezone</span>
                </div>
                <div className="bg-slate-50/70 border border-slate-200 rounded-xl p-3.5">
                  {!values.client ? (
                    <p
                      className="text-center text-xs py-2 font-medium"
                      style={{ color: "#1A73E8", fontFamily: "Outfit, sans-serif" }}
                    >
                      Select a client to enable time selection
                    </p>
                  ) : (
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-[11px] font-semibold text-slate-600 mb-1.5" style={{ fontFamily: "Outfit, sans-serif" }}>
                          Start Time
                        </p>
                        <div className="flex items-center gap-1.5">
                          <input
                            type="number"
                            min={0}
                            max={23}
                            value={values.startHour}
                            onChange={(e) =>
                              onChange({ startHour: Math.min(23, Math.max(0, Number(e.target.value))) })
                            }
                            className="w-14 text-center border border-slate-200 rounded-lg py-1.5 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-white"
                            style={{ fontFamily: "DM Sans, sans-serif" }}
                          />
                          <span className="text-slate-400 font-bold text-xs">:</span>
                          <input
                            type="number"
                            min={0}
                            max={59}
                            value={values.startMinute}
                            onChange={(e) =>
                              onChange({ startMinute: Math.min(59, Math.max(0, Number(e.target.value))) })
                            }
                            className="w-14 text-center border border-slate-200 rounded-lg py-1.5 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-white"
                            style={{ fontFamily: "DM Sans, sans-serif" }}
                          />
                        </div>
                        {values.date && (
                          <p className="text-[10px] text-slate-500 mt-1 font-mono">
                            {fmtDate(startHHMM)}
                          </p>
                        )}
                      </div>
                      <div>
                        <p className="text-[11px] font-semibold text-slate-600 mb-1.5" style={{ fontFamily: "Outfit, sans-serif" }}>
                          End Time (Auto)
                        </p>
                        <div className="flex items-center gap-1.5">
                          <div
                            className="w-14 text-center border border-slate-200 rounded-lg py-1.5 text-xs font-semibold text-slate-500 bg-slate-100"
                            style={{ fontFamily: "DM Sans, sans-serif" }}
                          >
                            {String(endHour).padStart(2, "0")}
                          </div>
                          <span className="text-slate-400 font-bold text-xs">:</span>
                          <div
                            className="w-14 text-center border border-slate-200 rounded-lg py-1.5 text-xs font-semibold text-slate-500 bg-slate-100"
                            style={{ fontFamily: "DM Sans, sans-serif" }}
                          >
                            {String(endMin).padStart(2, "0")}
                          </div>
                        </div>
                        {values.date && (
                          <p className="text-[10px] text-slate-500 mt-1 font-mono">
                            {fmtDate(endHHMM)}
                          </p>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Session Type */}
              <div className="space-y-1.5">
                <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider select-none">
                  <GripVertical className="w-3 h-3 text-slate-300" />
                  <span>Session Type</span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => onChange({ sessionType: "video" })}
                    className={`py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer flex items-center justify-center gap-2 ${
                      values.sessionType === "video"
                        ? "bg-blue-600 text-white shadow-2xs"
                        : "bg-slate-50 text-slate-700 border border-slate-200 hover:bg-slate-100"
                    }`}
                    style={{ fontFamily: "Outfit, sans-serif" }}
                  >
                    Video Visit
                  </button>
                  <button
                    type="button"
                    onClick={() => onChange({ sessionType: "inPerson" })}
                    className={`py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer flex items-center justify-center gap-2 ${
                      values.sessionType === "inPerson"
                        ? "bg-blue-600 text-white shadow-2xs"
                        : "bg-slate-50 text-slate-700 border border-slate-200 hover:bg-slate-100"
                    }`}
                    style={{ fontFamily: "Outfit, sans-serif" }}
                  >
                    In-Person Visit
                  </button>
                </div>
              </div>

              {/* In-Person Location */}
              {values.sessionType === "inPerson" && (
                <div className="space-y-1.5 pt-1 animate-in fade-in duration-150">
                  <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider select-none">
                    <GripVertical className="w-3 h-3 text-slate-300" />
                    <span>Location <span className="text-red-500">*</span></span>
                  </div>
                  <input
                    type="text"
                    placeholder="e.g. Main Clinic, Examination Room 3"
                    value={values.location || ""}
                    onChange={(e) => onChange({ location: e.target.value })}
                    className={inputCls}
                    style={{ fontFamily: "Outfit, sans-serif" }}
                  />
                </div>
              )}
            </div>
          </div>

          {/* ── SECTION 4: WORKFLOW CONTEXT ── */}
          <div id="section-workflow" className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
            {/* Section Header */}
            <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-white">
              <div className="flex items-center gap-2">
                <GripVertical className="w-3.5 h-3.5 text-slate-400" />
                <span
                  className="text-xs font-bold text-slate-800 uppercase tracking-wider"
                  style={{ fontFamily: "Outfit, sans-serif" }}
                >
                  Workflow Context
                </span>
              </div>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold font-mono uppercase tracking-wider bg-slate-100 text-slate-600">
                Optional
              </span>
            </div>

            {/* Section Body */}
            <div className="p-4 space-y-3.5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider select-none">
                    <GripVertical className="w-3 h-3 text-slate-300" />
                    <span>Select Process</span>
                  </div>
                  <CustomSelect
                    value={values.processId || ""}
                    onChange={(val) => onChange({ processId: val, stageId: "" })}
                    placeholder="Select a process"
                    options={[
                      { value: "", label: "Select a process" },
                      ...Object.keys(processStages).map((p) => ({
                        value: p,
                        label: p,
                      })),
                    ]}
                  />
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider select-none">
                    <GripVertical className="w-3 h-3 text-slate-300" />
                    <span>Select Stage</span>
                  </div>
                  <CustomSelect
                    value={values.stageId || ""}
                    onChange={(val) => onChange({ stageId: val })}
                    disabled={!values.processId}
                    placeholder={values.processId ? "Select a stage" : "Select process first"}
                    options={[
                      { value: "", label: "Select a stage" },
                      ...(processStages[values.processId] || []).map((s) => ({
                        value: s,
                        label: s,
                      })),
                    ]}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* ── SECTION 5: INSURANCE & BILLING ── */}
          <div id="section-insurance" className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
            {/* Section Header */}
            <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-white">
              <div className="flex items-center gap-2">
                <GripVertical className="w-3.5 h-3.5 text-slate-400" />
                <span
                  className="text-xs font-bold text-slate-800 uppercase tracking-wider"
                  style={{ fontFamily: "Outfit, sans-serif" }}
                >
                  Insurance &amp; Billing
                </span>
                <label className="flex items-center gap-1.5 cursor-pointer select-none text-xs text-slate-600 font-medium ml-2">
                  <input
                    type="checkbox"
                    checked={values.syncToCase ?? true}
                    onChange={(e) => {
                      const isSynced = e.target.checked;
                      onChange({ syncToCase: isSynced });
                      if (!isSynced) {
                        setInsuranceExpanded(true);
                      }
                    }}
                    className="w-3.5 h-3.5 text-blue-600 rounded border-slate-300 focus:ring-blue-500 cursor-pointer"
                  />
                  <span>Sync to case</span>
                </label>
                <span
                  className="text-slate-400 hover:text-slate-600 cursor-help"
                  title="Sync this appointment's billing encounter and claims to the client's active case"
                >
                  <Info className="w-3.5 h-3.5" />
                </span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddInsuranceOpen(true)}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold text-blue-600 border border-blue-200 bg-white hover:bg-blue-50 transition-colors cursor-pointer"
                  style={{ fontFamily: "Outfit, sans-serif" }}
                >
                  <Plus className="w-3 h-3" /> Add Insurance
                </button>
                <button
                  type="button"
                  onClick={() => setInsuranceExpanded(!insuranceExpanded)}
                  className="p-1 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
                  title={insuranceExpanded ? "Collapse section" : "Expand section"}
                >
                  {insuranceExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Collapsed One-line summary when Sync to case is ON */}
            {!insuranceExpanded && (values.syncToCase ?? true) && (
              <div
                onClick={() => setInsuranceExpanded(true)}
                className="px-4 py-3 text-xs text-slate-600 bg-white hover:bg-slate-50 transition-colors cursor-pointer flex items-center justify-between"
              >
                <div className="flex items-center gap-2 truncate">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
                  <span className="font-semibold text-slate-800">Synced from case:</span>
                  <span className="text-slate-700 truncate">
                    {values.primaryInsurance || "MVP HEALTH CARE MEDICAID (30880293243)"}
                  </span>
                  <span className="text-slate-400">·</span>
                  <span className="text-emerald-700 font-medium">
                    {values.preCertification || (values.serviceName || values.title ? "Pre-Authorized" : "Not Required")}
                  </span>
                </div>
                <span className="text-[11px] text-blue-600 font-semibold shrink-0 ml-2">Edit</span>
              </div>
            )}

            {/* Expanded Fields */}
            {insuranceExpanded && (
              <div className="p-4 space-y-3.5 animate-in fade-in duration-200">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider select-none">
                      <GripVertical className="w-3 h-3 text-slate-300" />
                      <span>Primary Insurance <span className="text-red-500">*</span></span>
                    </div>
                    <CustomSelect
                      value={values.primaryInsurance || ""}
                      onChange={(val) => onChange({ primaryInsurance: val })}
                      placeholder="Select primary insurance"
                      options={[
                        { value: "", label: "Select primary insurance" },
                        ...insuranceRecords.filter((ins) => !ins.archived).map((ins) => ({
                          value: `${ins.insuranceProvider} (${ins.policyNumber})`,
                          label: ins.insuranceProvider,
                          sublabel: `Policy: ${ins.policyNumber}`,
                        })),
                      ]}
                    />
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider select-none">
                      <GripVertical className="w-3 h-3 text-slate-300" />
                      <span>Pre-Certification</span>
                    </div>
                    <div
                      className="bg-slate-50/70 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-medium text-slate-800 w-full flex items-center justify-between min-h-[42px] cursor-not-allowed select-none"
                      title="Pre-certification indicates whether this service is pre-authorized. Non-changeable from here."
                    >
                      <div className="flex items-center gap-2 truncate">
                        <span
                          className={`w-2 h-2 rounded-full shrink-0 ${
                            (values.preCertification || (values.serviceName || values.title ? "Pre-Authorized" : "Not Required")) === "Pre-Authorized"
                              ? "bg-emerald-500"
                              : "bg-slate-400"
                          }`}
                        />
                        <span className="font-semibold text-slate-800 truncate" style={{ fontFamily: "Outfit, sans-serif" }}>
                          {values.preCertification || (values.serviceName || values.title ? "Pre-Authorized" : "Not Required")}
                        </span>
                      </div>
                      <span className="text-[10px] text-slate-500 font-medium shrink-0 ml-1.5 flex items-center gap-1 bg-white px-2 py-0.5 rounded border border-slate-200">
                        <Lock className="w-2.5 h-2.5 text-slate-400" />
                        <span>Fixed</span>
                      </span>
                    </div>
                  </div>
                </div>

                {/* Secondary Insurance */}
                <div className="space-y-2 pt-1">
                  <label className="flex items-center gap-2 cursor-pointer select-none text-xs text-slate-700 font-medium">
                    <input
                      type="checkbox"
                      checked={values.hasSecondaryInsurance || false}
                      onChange={(e) => onChange({ hasSecondaryInsurance: e.target.checked })}
                      className="w-3.5 h-3.5 text-blue-600 rounded border-slate-300 focus:ring-blue-500 cursor-pointer"
                    />
                    <span>Secondary Insurance</span>
                  </label>

                  {values.hasSecondaryInsurance && (
                    <div className="pt-1 animate-in fade-in duration-150">
                      <CustomSelect
                        value={values.secondaryInsurance || ""}
                        onChange={(val) => onChange({ secondaryInsurance: val })}
                        placeholder="Select secondary insurance"
                        options={[
                          { value: "", label: "Select secondary insurance" },
                          ...insuranceRecords.filter((ins) => !ins.archived).map((ins) => ({
                            value: `${ins.insuranceProvider} (${ins.policyNumber})`,
                            label: ins.insuranceProvider,
                            sublabel: `Policy: ${ins.policyNumber}`,
                          })),
                        ]}
                      />
                    </div>
                  )}
                </div>

                {/* Invoice Generation Details */}
                {(values.serviceId || (currentLineItems && currentLineItems.length > 0)) && (
                  <div className="rounded-xl border border-blue-200 bg-blue-50/40 p-4 space-y-4 mt-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Receipt className="w-4 h-4 text-blue-600" />
                        <span className="text-xs font-bold text-slate-900 uppercase tracking-wider" style={{ fontFamily: "Outfit, sans-serif" }}>
                          Invoice Details
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setInvoiceSectionExpanded(!invoiceSectionExpanded)}
                        className="text-slate-500 hover:text-slate-700 cursor-pointer"
                      >
                        {invoiceSectionExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                      </button>
                    </div>

                    {invoiceSectionExpanded && (
                      <div className="space-y-4 pt-1">
                        {/* Toggle: Generate Invoice */}
                        <div className="flex items-center justify-between bg-white p-3 rounded-xl border border-slate-200">
                          <div>
                            <p className="text-xs font-semibold text-slate-800">Generate invoice for this appointment</p>
                            <p className="text-[11px] text-slate-500">Automatically creates an invoice upon booking</p>
                          </div>
                          <input
                            type="checkbox"
                            checked={values.generateInvoice ?? true}
                            onChange={(e) => onChange({ generateInvoice: e.target.checked })}
                            className="w-4 h-4 text-blue-600 rounded cursor-pointer"
                          />
                        </div>

                        {values.generateInvoice && (
                          <>
                            {/* Line Items Table */}
                            <div className="space-y-2">
                              <div className="flex items-center justify-between text-xs font-semibold text-slate-600">
                                <span>Line Items</span>
                                <button
                                  type="button"
                                  onClick={handleAddManualLineItem}
                                  className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700 font-medium cursor-pointer"
                                >
                                  <Plus className="w-3.5 h-3.5" /> Add line item
                                </button>
                              </div>

                              <div className="space-y-2">
                                {currentLineItems.map((item, idx) => (
                                  <div key={item.id} className="flex items-center gap-2 bg-white p-2.5 rounded-xl border border-slate-200 text-xs">
                                    <input
                                      type="text"
                                      value={item.description}
                                      onChange={(e) => handleUpdateLineItem(idx, { description: e.target.value })}
                                      placeholder="Description"
                                      className="flex-1 px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
                                    />
                                    <div className="w-16 flex items-center gap-1">
                                      <span className="text-slate-400 text-[11px]">Qty:</span>
                                      <input
                                        type="number"
                                        min={1}
                                        value={item.quantity}
                                        onChange={(e) => handleUpdateLineItem(idx, { quantity: Math.max(1, parseInt(e.target.value) || 1) })}
                                        className="w-full text-center py-1.5 border border-slate-200 rounded-lg text-xs"
                                      />
                                    </div>
                                    <div className="w-20 flex items-center gap-1">
                                      <span className="text-slate-400 text-[11px]">$</span>
                                      <input
                                        type="number"
                                        min={0}
                                        value={item.unitPrice}
                                        onChange={(e) => handleUpdateLineItem(idx, { unitPrice: parseFloat(e.target.value) || 0 })}
                                        className="w-full text-right py-1.5 border border-slate-200 rounded-lg text-xs"
                                      />
                                    </div>
                                    <button
                                      type="button"
                                      onClick={() => handleRemoveLineItem(idx)}
                                      className="text-slate-400 hover:text-red-500 p-1 cursor-pointer"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  </div>
                                ))}
                              </div>
                            </div>

                            {/* Discount Input */}
                            <div className="flex items-center justify-between gap-4">
                              <label className="text-xs font-semibold text-slate-700">Discount Amount ($)</label>
                              <input
                                type="number"
                                min={0}
                                value={values.discountAmount || 0}
                                onChange={(e) => onChange({ discountAmount: parseFloat(e.target.value) || 0 })}
                                className="w-28 px-2.5 py-1.5 text-right border border-slate-200 rounded-lg text-xs bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                              />
                            </div>

                            {/* Computed Breakdown Card */}
                            <div className="bg-white p-3.5 rounded-xl border border-slate-200 space-y-1.5 text-xs text-slate-600">
                              <div className="flex justify-between">
                                <span>Subtotal</span>
                                <span className="font-semibold text-slate-800">${subtotal.toFixed(2)}</span>
                              </div>
                              {discount > 0 && (
                                <div className="flex justify-between text-green-600">
                                  <span>Discount</span>
                                  <span>-${discount.toFixed(2)}</span>
                                </div>
                              )}
                              <div className="flex justify-between">
                                <span>Tax (8% mock rate)</span>
                                <span>${tax.toFixed(2)}</span>
                              </div>
                              <div className="flex justify-between pt-2 border-t border-slate-100 text-sm font-bold text-slate-900">
                                <span>Total Invoice Amount</span>
                                <span className="text-blue-600">${total.toFixed(2)}</span>
                              </div>
                            </div>
                          </>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* ── SECTION 6: ADDITIONAL DETAILS ── */}
          <div id="section-details" className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
            {/* Section Header */}
            <button
              type="button"
              onClick={() => setAdditionalDetailsExpanded(!additionalDetailsExpanded)}
              className="w-full p-4 border-b border-slate-100 flex items-center justify-between bg-white hover:bg-slate-50/60 transition-colors cursor-pointer text-left"
            >
              <div className="flex items-center gap-2">
                <GripVertical className="w-3.5 h-3.5 text-slate-400" />
                <span
                  className="text-xs font-bold text-slate-800 uppercase tracking-wider"
                  style={{ fontFamily: "Outfit, sans-serif" }}
                >
                  Additional Details
                </span>
                <span className="text-[11px] text-slate-400 font-normal">
                  (Title, Description, Notes, Tags)
                </span>
              </div>
              <span className="text-xs font-semibold text-blue-600 flex items-center gap-1">
                {additionalDetailsExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                <span>{additionalDetailsExpanded ? "Hide" : "+ Add details"}</span>
              </span>
            </button>

            {/* Section Body */}
            {additionalDetailsExpanded && (
              <div className="p-4 space-y-3.5 animate-in fade-in duration-150">
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider select-none">
                      <GripVertical className="w-3 h-3 text-slate-300" />
                      <span>Title <span className="text-red-500">*</span></span>
                    </div>
                    <span className="text-[10px] text-slate-400">Auto-filled from service, editable</span>
                  </div>
                  <input
                    type="text"
                    placeholder="e.g., Follow-up consultation"
                    value={values.title}
                    onChange={(e) => onChange({ title: e.target.value })}
                    className={inputCls}
                    style={{ fontFamily: "Outfit, sans-serif" }}
                  />
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider select-none">
                    <GripVertical className="w-3 h-3 text-slate-300" />
                    <span>Description</span>
                  </div>
                  <textarea
                    placeholder="Add appointment details..."
                    value={values.description}
                    onChange={(e) => onChange({ description: e.target.value })}
                    rows={2}
                    className={inputCls + " resize-none"}
                    style={{ fontFamily: "Outfit, sans-serif" }}
                  />
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider select-none">
                    <GripVertical className="w-3 h-3 text-slate-300" />
                    <span>Note</span>
                  </div>
                  <input
                    type="text"
                    placeholder="Quick note..."
                    value={values.note}
                    onChange={(e) => onChange({ note: e.target.value })}
                    className={inputCls}
                    style={{ fontFamily: "Outfit, sans-serif" }}
                  />
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider select-none">
                    <GripVertical className="w-3 h-3 text-slate-300" />
                    <span>Tags</span>
                  </div>
                  <input
                    type="text"
                    placeholder="Comma-separated tags, e.g., follow-up, urgent"
                    value={values.tags}
                    onChange={(e) => onChange({ tags: e.target.value })}
                    className={inputCls}
                    style={{ fontFamily: "Outfit, sans-serif" }}
                  />
                </div>

                {/* Custom Fields */}
                {(visibleCustomFieldKeys.length > 0 || customFields.length > 0) && (
                  <div className="border-t border-slate-200 pt-3 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider select-none">
                        <GripVertical className="w-3 h-3 text-slate-300" />
                        <span>Custom Fields</span>
                      </div>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={onOpenSelectFields}
                          className="text-xs text-blue-600 hover:text-blue-700 font-medium cursor-pointer"
                        >
                          Select Fields
                        </button>
                        <span className="text-slate-300">|</span>
                        <button
                          type="button"
                          onClick={onOpenCreateField}
                          className="text-xs text-blue-600 hover:text-blue-700 font-medium cursor-pointer"
                        >
                          + Create Field
                        </button>
                      </div>
                    </div>
                    <div className="space-y-3">
                      {customFields
                        .filter((f) => visibleCustomFieldKeys.includes(f.key))
                        .map((f) => (
                          <div key={f.key} className="space-y-1.5">
                            <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider select-none">
                              <GripVertical className="w-3 h-3 text-slate-300" />
                              <span>{f.label}{f.required && <span className="text-red-500 ml-0.5">*</span>}</span>
                            </div>
                            <input
                              type="text"
                              value={customFieldValues[f.key] || ""}
                              onChange={(e) => onCustomFieldChange(f.key, e.target.value)}
                              placeholder={f.placeholder || `Enter ${f.label.toLowerCase()}`}
                              className={inputCls}
                              style={{ fontFamily: "Outfit, sans-serif" }}
                            />
                          </div>
                        ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
  </CustomSideDrawer>

    <AddInsuranceDrawer
      isOpen={isAddInsuranceOpen}
      onClose={() => setIsAddInsuranceOpen(false)}
      onSubmit={(ins) => {
        const newRecord: ClientInsuranceRecord = {
          id: `ins-${Date.now()}`,
          uid: String(Math.floor(100000 + Math.random() * 900000)),
          clientId: values.client?.id ? String(values.client.id) : undefined,
          clientName: values.client?.name,
          insuranceProvider: ins.insuranceCompany || "Unknown Provider",
          status: !ins.expiryDate ? "no_expiry" : "active",
          effectiveDate: ins.effectiveDate || null,
          expiryDate: ins.expiryDate || null,
          policyNumber: ins.policyNumber || "-",
          groupNumber: ins.groupNumber || "-",
          planType: ins.planType || "COMMERCIAL",
        };
        addStoredInsuranceRecord(newRecord);
        const updated = getStoredInsuranceRecords(values.client?.id ? String(values.client.id) : undefined);
        setInsuranceRecords(updated);
        onChange({ primaryInsurance: `${newRecord.insuranceProvider} (${newRecord.policyNumber})` });
        setIsAddInsuranceOpen(false);
        toast.success(`Added ${newRecord.insuranceProvider} and selected as primary insurance`);
      }}
    />
  </>
  );
}
