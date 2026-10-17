import React, { useState, useEffect, useMemo } from "react";
import {
  X,
  Plus,
  Trash2,
  Sparkles,
  Calendar,
  User,
  Shield,
  FileCheck,
  CheckCircle2,
  DollarSign,
  Activity,
  AlertCircle,
  Receipt,
  FileText,
  Link2,
  Check,
} from "lucide-react";
import Button from "../ui/Button";
import CPTCodeInput from "../ui/CPTCodeInput";
import ICDCodeInput from "../ui/ICDCodeInput";
import {
  Claim,
  ClaimDiagnosisCode,
  ClaimServiceLine,
  POPULAR_PAYERS,
  generateClaimNumber,
  saveClaim,
} from "../../../lib/claimsStore";
import { loadServices, Service } from "../../../lib/servicesStore";
import { getScribeSessions, ScribeSession } from "../../../lib/scribeSessionStore";
import { getICDCodeItem } from "../../../lib/icdCodes";
import { getCPTCodeOption } from "../../../lib/cptCodes";
import { useClients } from "../../../lib/clientsStore";
import { useInvoices } from "../../context/InvoiceContext";

interface CreateClaimDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onClaimCreated: (createdClaim: Claim, autoOpenSubmitModal?: boolean) => void;
  initialAppointmentId?: string;
  initialClientId?: string;
  initialInvoiceId?: string;
  claimToEdit?: Claim | null;
}

export default function CreateClaimDrawer({
  isOpen,
  onClose,
  onClaimCreated,
  initialAppointmentId,
  initialClientId,
  initialInvoiceId,
  claimToEdit,
}: CreateClaimDrawerProps) {
  const { clients } = useClients();
  const { invoices } = useInvoices();

  // Cascade Selection States
  const [selectedClientId, setSelectedClientId] = useState<string>("");
  const [selectedAppointmentId, setSelectedAppointmentId] = useState<string>("");
  const [selectedInvoiceId, setSelectedInvoiceId] = useState<string>("");

  // Appointment list
  const [appointmentsList, setAppointmentsList] = useState<any[]>([]);
  const [scribeSessionMatch, setScribeSessionMatch] = useState<ScribeSession | null>(null);

  // Form Fields
  const [patientName, setPatientName] = useState("");
  const [patientId, setPatientId] = useState("CL-001");
  const [patientDob, setPatientDob] = useState("1992-04-15");
  const [patientGender, setPatientGender] = useState<"Male" | "Female" | "Other">("Female");
  const [patientAddress, setPatientAddress] = useState("742 Evergreen Terr, Springfield, IL 62704");
  const [patientPhone, setPatientPhone] = useState("+1 (555) 123-4567");

  // Payer
  const [selectedPayerId, setSelectedPayerId] = useState(POPULAR_PAYERS[0].id);
  const [insuredId, setInsuredId] = useState("BCBS-8821940");
  const [groupNumber, setGroupNumber] = useState("GRP-9901");

  // Clinical & Billing
  const [renderingProviderName, setRenderingProviderName] = useState("Dr. Priya Sharma");
  const [renderingProviderNpi, setRenderingProviderNpi] = useState("1487920194");
  const [billingProviderName, setBillingProviderName] = useState("MantraCare Health Center LLC");
  const [billingProviderNpi, setBillingProviderNpi] = useState("1932840192");
  const [billingProviderTaxId, setBillingProviderTaxId] = useState("XX-XXX4912");
  const [billingProviderAddress, setBillingProviderAddress] = useState("100 Medical Center Way, Suite 400, Chicago, IL 60601");
  const [placeOfService, setPlaceOfService] = useState("11 - Office");
  const [serviceDate, setServiceDate] = useState(new Date().toISOString().slice(0, 10));

  // Diagnoses (ICD-10)
  const [diagnoses, setDiagnoses] = useState<ClaimDiagnosisCode[]>([
    { pointer: "A", code: "F41.1", description: "Generalized anxiety disorder" },
  ]);

  // Service Lines (CPT)
  const [lines, setLines] = useState<ClaimServiceLine[]>([
    {
      id: "line-" + Date.now(),
      serviceDate: new Date().toISOString().slice(0, 10),
      cptCode: "90834",
      description: "Psychotherapy, 45 minutes with patient",
      modifier: "",
      diagnosisPointer: "A",
      units: 1,
      chargeAmount: 150.0,
    },
  ]);

  // Load available appointments
  useEffect(() => {
    try {
      const saved = localStorage.getItem("appointments_v1") || sessionStorage.getItem("appointments_v1");
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setAppointmentsList(parsed);
          return;
        }
      }
    } catch {}

    // Fallback default appointments
    setAppointmentsList([
      { id: "apt-101", title: "Comprehensive Eye Exam", clientName: "Sarah Johnson", clientPhone: "+1 (555) 123-4567", serviceId: 1, date: "2026-08-24", time: "10:45", notes: "Cataract review", clientId: "CL-001" },
      { id: "apt-102", title: "Pulmonology Consult", clientName: "Michael Chen", clientPhone: "+1 (555) 234-5678", serviceId: 2, date: "2026-08-24", time: "09:30", notes: "Bronchitis & fever", clientId: "CL-002" },
      { id: "apt-103", title: "Orthopedic Evaluation", clientName: "Emily Davis", clientPhone: "+1 (555) 345-6789", serviceId: 3, date: "2026-08-23", time: "16:15", notes: "Knee osteoarthritis", clientId: "CL-003" },
      { id: "apt-104", title: "Post-Lasik Follow Up", clientName: "Robert Wilson", clientPhone: "+1 (555) 456-7890", serviceId: 4, date: "2026-08-23", time: "14:00", notes: "Post-Lasik follow up", clientId: "CL-004" },
    ]);
  }, [isOpen]);

  // Derived filterings for Client -> Appointment -> Invoice
  const selectedClient = useMemo(() => {
    return clients.find(
      (c) => c.id === selectedClientId || (patientName && c.name?.toLowerCase() === patientName.toLowerCase())
    );
  }, [clients, selectedClientId, patientName]);

  const availableAppointments = useMemo(() => {
    if (!selectedClientId && !patientName) return appointmentsList;
    const filtered = appointmentsList.filter(
      (a) =>
        (selectedClientId && (a.clientId === selectedClientId || String(a.patientId) === selectedClientId)) ||
        (patientName && a.clientName?.toLowerCase() === patientName.toLowerCase())
    );
    return filtered.length > 0 ? filtered : appointmentsList;
  }, [appointmentsList, selectedClientId, patientName]);

  const selectedAppointment = useMemo(() => {
    return appointmentsList.find((a) => String(a.id) === String(selectedAppointmentId));
  }, [appointmentsList, selectedAppointmentId]);

  const availableInvoices = useMemo(() => {
    const list: { invoice: any; isDirectAppointmentMatch: boolean }[] = [];
    const seenIds = new Set<string>();

    if (selectedAppointmentId) {
      invoices.forEach((inv) => {
        const isMatch =
          String(inv.appointmentId) === String(selectedAppointmentId) ||
          (selectedAppointment?.invoiceId && String(inv.id) === String(selectedAppointment.invoiceId));
        if (isMatch) {
          seenIds.add(inv.id);
          list.push({ invoice: inv, isDirectAppointmentMatch: true });
        }
      });
    }

    invoices.forEach((inv) => {
      if (!seenIds.has(inv.id)) {
        const matchClient =
          (selectedClientId && inv.clientId === selectedClientId) ||
          (patientName && inv.clientName?.toLowerCase() === patientName.toLowerCase());
        if (matchClient) {
          seenIds.add(inv.id);
          list.push({ invoice: inv, isDirectAppointmentMatch: false });
        }
      }
    });

    return list;
  }, [invoices, selectedAppointmentId, selectedAppointment, selectedClientId, patientName]);

  const selectedInvoice = useMemo(() => {
    return invoices.find((inv) => String(inv.id) === String(selectedInvoiceId));
  }, [invoices, selectedInvoiceId]);

  // Handler: Selecting a Client
  const handleSelectClient = (clientId: string) => {
    setSelectedClientId(clientId);
    if (!clientId) {
      return;
    }

    const cl = clients.find((c) => c.id === clientId);
    if (!cl) return;

    setPatientName(cl.name);
    setPatientId(cl.id);
    if (cl.phone) setPatientPhone(cl.phone);
    if ((cl as any).dob) setPatientDob((cl as any).dob);
    if ((cl as any).gender) setPatientGender((cl as any).gender);
    if ((cl as any).address || (cl as any).location) {
      setPatientAddress((cl as any).address || (cl as any).location);
    }

    // Auto-select first appointment for this client if available
    const clientAppts = appointmentsList.filter(
      (a) => a.clientId === cl.id || a.clientName?.toLowerCase() === cl.name.toLowerCase()
    );
    if (clientAppts.length > 0) {
      if (!clientAppts.some((a) => String(a.id) === String(selectedAppointmentId))) {
        handleSelectAppointment(String(clientAppts[0].id), clientAppts[0]);
      }
    } else {
      setSelectedAppointmentId("");
      setSelectedInvoiceId("");
    }
  };

  // Handler: Selecting an Appointment Encounter
  const handleSelectAppointment = (aptId: string, directApptObj?: any) => {
    setSelectedAppointmentId(aptId);
    if (!aptId) {
      setScribeSessionMatch(null);
      setSelectedInvoiceId("");
      return;
    }

    const appt = directApptObj || appointmentsList.find((a) => String(a.id) === String(aptId));
    if (!appt) return;

    if (appt.clientName) setPatientName(appt.clientName);
    if (appt.clientPhone) setPatientPhone(appt.clientPhone);
    if (appt.clientId) {
      setPatientId(appt.clientId);
      if (!selectedClientId || selectedClientId !== appt.clientId) {
        setSelectedClientId(appt.clientId);
      }
    }
    if (appt.date) {
      setServiceDate(appt.date);
      setLines((prev) => prev.map((l) => ({ ...l, serviceDate: appt.date })));
    }

    // Link AI Scribe ICD-10 Code
    const scribeSessions = getScribeSessions();
    const matchingSession = scribeSessions.find(
      (s) =>
        (appt.clientId && s.clientId === appt.clientId) ||
        (s.clientName && s.clientName.toLowerCase() === appt.clientName.toLowerCase()) ||
        (s.appointmentId && String(s.appointmentId) === String(aptId))
    );

    if (matchingSession && matchingSession.extractedData) {
      setScribeSessionMatch(matchingSession);
      if (matchingSession.doctorName) setRenderingProviderName(matchingSession.doctorName);
      if (matchingSession.patientAge) {
        const estYear = new Date().getFullYear() - matchingSession.patientAge;
        setPatientDob(`${estYear}-05-10`);
      }
      if (matchingSession.patientGender) {
        setPatientGender(matchingSession.patientGender as any);
      }

      const primaryCode = matchingSession.extractedData.icd10Code || (matchingSession.extractedData.diagnosis.toLowerCase().includes("cataract") ? "H25.11" : matchingSession.extractedData.diagnosis.toLowerCase().includes("bronchitis") ? "J20.9" : "M17.0");
      const icdOpt = getICDCodeItem(primaryCode);

      const newDiags: ClaimDiagnosisCode[] = [
        {
          pointer: "A",
          code: primaryCode,
          description: icdOpt ? icdOpt.shortDescription : matchingSession.extractedData.diagnosis,
        },
      ];

      if (matchingSession.extractedData.secondaryDiagnosis && matchingSession.extractedData.secondaryDiagnosis.length > 0) {
        const secText = matchingSession.extractedData.secondaryDiagnosis[0];
        const secCode = secText.toLowerCase().includes("hypertension") ? "I10" : secText.toLowerCase().includes("diabetes") ? "E11.9" : "F41.1";
        const secOpt = getICDCodeItem(secCode);
        newDiags.push({
          pointer: "B",
          code: secCode,
          description: secOpt ? secOpt.shortDescription : secText,
        });
      }

      setDiagnoses(newDiags);
    } else {
      setScribeSessionMatch(null);
    }

    // Auto-match invoice against this appointment
    const matchedInvoice = invoices.find(
      (inv) =>
        String(inv.appointmentId) === String(aptId) ||
        (appt.invoiceId && String(inv.id) === String(appt.invoiceId))
    );
    if (matchedInvoice) {
      handleSelectInvoice(matchedInvoice.id, matchedInvoice, appt.date);
    } else {
      // Default CPT service line from appointment service
      const allServices = loadServices();
      const matchedService = allServices.find((s) => s.id === Number(appt.serviceId) || s.name.toLowerCase() === (appt.serviceName || "").toLowerCase());
      if (matchedService) {
        const cpt = matchedService.cptCode || "99213";
        const cptOpt = getCPTCodeOption(cpt);
        setLines([
          {
            id: "line-" + Date.now(),
            serviceDate: appt.date || new Date().toISOString().slice(0, 10),
            cptCode: cpt,
            description: cptOpt ? cptOpt.description : matchedService.name,
            modifier: "",
            diagnosisPointer: "A",
            units: 1,
            chargeAmount: Number(matchedService.price) || 120.0,
          },
        ]);
      }
    }
  };

  // Handler: Selecting an Invoice Against Appointment
  const handleSelectInvoice = (invoiceId: string, directInvObj?: any, overrideDate?: string) => {
    setSelectedInvoiceId(invoiceId);
    if (!invoiceId) return;

    const inv = directInvObj || invoices.find((i) => String(i.id) === String(invoiceId));
    if (!inv) return;

    if (inv.clientId && (!selectedClientId || selectedClientId !== inv.clientId)) {
      setSelectedClientId(inv.clientId);
      setPatientId(inv.clientId);
    }
    if (inv.clientName && !patientName) {
      setPatientName(inv.clientName);
    }

    // Sync line items into CPT service lines
    if (inv.lineItems && inv.lineItems.length > 0) {
      const allServices = loadServices();
      const sDate = overrideDate || serviceDate || inv.issueDate || inv.createdAt?.slice(0, 10) || new Date().toISOString().slice(0, 10);
      const convertedLines: ClaimServiceLine[] = inv.lineItems.map((li: any, idx: number) => {
        const matchedService = allServices.find(
          (s) => s.name.toLowerCase() === (li.name || "").toLowerCase()
        );
        const cpt = matchedService?.cptCode || (li.name?.toLowerCase().includes("therapy") ? "90834" : li.name?.toLowerCase().includes("consult") ? "99213" : "99214");
        const cptOpt = getCPTCodeOption(cpt);
        return {
          id: "line-" + Date.now() + "-" + idx,
          serviceDate: sDate,
          cptCode: cpt,
          description: cptOpt ? cptOpt.description : (li.name || "Service Item"),
          modifier: "",
          diagnosisPointer: "A",
          units: Number(li.quantity) || 1,
          chargeAmount: Number(li.rate) || Number(li.amount) || 120.0,
        };
      });
      setLines(convertedLines);
    }
  };

  // Diagnosis handlers
  const handleDiagnosisCodeChange = (index: number, code: string) => {
    const updated = [...diagnoses];
    const icdOpt = getICDCodeItem(code);
    updated[index] = {
      ...updated[index],
      code,
      description: icdOpt ? icdOpt.shortDescription : updated[index].description || "Diagnosis specified",
    };
    setDiagnoses(updated);
  };

  const handleAddDiagnosis = () => {
    if (diagnoses.length >= 4) return;
    const pointers: ("A" | "B" | "C" | "D")[] = ["A", "B", "C", "D"];
    const nextPointer = pointers[diagnoses.length];
    setDiagnoses([...diagnoses, { pointer: nextPointer, code: "", description: "" }]);
  };

  const handleRemoveDiagnosis = (index: number) => {
    if (diagnoses.length <= 1) return;
    const filtered = diagnoses.filter((_, i) => i !== index);
    const pointers: ("A" | "B" | "C" | "D")[] = ["A", "B", "C", "D"];
    const reindexed = filtered.map((d, i) => ({ ...d, pointer: pointers[i] }));
    setDiagnoses(reindexed);
  };

  // Service line handlers
  const handleLineChange = (id: string, field: keyof ClaimServiceLine, val: any) => {
    setLines((prev) =>
      prev.map((line) => {
        if (line.id !== id) return line;
        const updated = { ...line, [field]: val };
        if (field === "cptCode") {
          const cptOpt = getCPTCodeOption(val);
          if (cptOpt) {
            updated.description = cptOpt.description;
          }
        }
        return updated;
      })
    );
  };

  const handleAddLine = () => {
    setLines([
      ...lines,
      {
        id: "line-" + Date.now(),
        serviceDate: serviceDate,
        cptCode: "99213",
        description: "Office/outpatient visit, established patient",
        modifier: "",
        diagnosisPointer: "A",
        units: 1,
        chargeAmount: 120.0,
      },
    ]);
  };

  const handleRemoveLine = (id: string) => {
    if (lines.length <= 1) return;
    setLines(lines.filter((l) => l.id !== id));
  };

  // Effect to populate form when editing an existing claim or creating with initial props
  useEffect(() => {
    if (!isOpen) return;

    if (claimToEdit) {
      setPatientName(claimToEdit.patientName || "");
      setPatientId(claimToEdit.patientId || "CL-001");
      setSelectedClientId(claimToEdit.patientId || "");
      setPatientDob(claimToEdit.patientDob || "1992-04-15");
      setPatientGender(claimToEdit.patientGender || "Female");
      setPatientAddress(claimToEdit.patientAddress || "742 Evergreen Terr, Springfield, IL 62704");
      setPatientPhone(claimToEdit.patientPhone || "+1 (555) 123-4567");
      setSelectedPayerId(claimToEdit.payer?.id || POPULAR_PAYERS[0].id);
      setInsuredId(claimToEdit.insuredId || "");
      setGroupNumber(claimToEdit.groupNumber || "");
      setRenderingProviderName(claimToEdit.renderingProviderName || "Dr. Priya Sharma");
      setRenderingProviderNpi(claimToEdit.renderingProviderNpi || "1487920194");
      setBillingProviderName(claimToEdit.billingProviderName || "MantraCare Health Center LLC");
      setBillingProviderNpi(claimToEdit.billingProviderNpi || "1932840192");
      setBillingProviderTaxId(claimToEdit.billingProviderTaxId || "XX-XXX4912");
      setBillingProviderAddress(claimToEdit.billingProviderAddress || "100 Medical Center Way, Suite 400, Chicago, IL 60601");
      setPlaceOfService(claimToEdit.placeOfService || "11 - Office");
      setServiceDate(claimToEdit.serviceDate || new Date().toISOString().slice(0, 10));
      if (claimToEdit.diagnosisCodes && claimToEdit.diagnosisCodes.length > 0) {
        setDiagnoses(claimToEdit.diagnosisCodes);
      }
      if (claimToEdit.lines && claimToEdit.lines.length > 0) {
        setLines(claimToEdit.lines);
      }
      setSelectedAppointmentId(claimToEdit.appointmentId || "");
      setSelectedInvoiceId(claimToEdit.invoiceId || "");
    } else {
      if (initialClientId) {
        handleSelectClient(initialClientId);
      }
      if (initialAppointmentId) {
        handleSelectAppointment(initialAppointmentId);
      }
      if (initialInvoiceId) {
        handleSelectInvoice(initialInvoiceId);
      }
    }
  }, [isOpen, claimToEdit, initialClientId, initialAppointmentId, initialInvoiceId]);

  // Financial totals
  const totalCharge = lines.reduce((sum, line) => sum + (Number(line.chargeAmount) || 0) * (Number(line.units) || 1), 0);

  // Submit / Save
  const handleSave = (status: "Draft" | "Ready to Submit", autoOpenSubmit = false) => {
    const selectedPayer = POPULAR_PAYERS.find((p) => p.id === selectedPayerId) || POPULAR_PAYERS[0];

    if (claimToEdit) {
      const updatedClaim: Claim = {
        ...claimToEdit,
        patientId: patientId || claimToEdit.patientId,
        patientName: patientName.trim() || claimToEdit.patientName,
        patientDob,
        patientGender,
        patientAddress,
        patientPhone,
        insuredId: insuredId.trim() || claimToEdit.insuredId,
        groupNumber,
        payer: selectedPayer,
        appointmentId: selectedAppointmentId || claimToEdit.appointmentId,
        appointmentTitle: selectedAppointment?.title || selectedAppointment?.serviceName || claimToEdit.appointmentTitle,
        invoiceId: selectedInvoiceId || claimToEdit.invoiceId,
        invoiceNumber: selectedInvoice?.invoiceNumber || selectedInvoice?.id || claimToEdit.invoiceNumber,
        scribeSessionId: scribeSessionMatch ? scribeSessionMatch.id : claimToEdit.scribeSessionId,
        renderingProviderName,
        renderingProviderNpi,
        billingProviderName,
        billingProviderNpi,
        billingProviderTaxId,
        billingProviderAddress,
        placeOfService,
        serviceDate,
        diagnosisCodes: diagnoses.filter((d) => d.code.trim().length > 0),
        lines: lines.map((l) => ({
          ...l,
          chargeAmount: Number(l.chargeAmount) || 0,
          units: Number(l.units) || 1,
        })),
        totalCharge,
        status: status,
        updatedAt: new Date().toISOString(),
      };

      saveClaim(updatedClaim);
      onClaimCreated(updatedClaim, autoOpenSubmit);
      onClose();
      return;
    }

    const newClaim: Claim = {
      id: "clm-" + Date.now(),
      claimNumber: generateClaimNumber(),
      patientId: patientId || "CL-001",
      patientName: patientName.trim() || "Patient",
      patientDob,
      patientGender,
      patientAddress,
      patientPhone,
      insuredId: insuredId.trim() || "INS-000000",
      groupNumber,
      payer: selectedPayer,
      appointmentId: selectedAppointmentId || undefined,
      appointmentTitle: selectedAppointment?.title || selectedAppointment?.serviceName || undefined,
      invoiceId: selectedInvoiceId || undefined,
      invoiceNumber: selectedInvoice?.invoiceNumber || selectedInvoice?.id || undefined,
      scribeSessionId: scribeSessionMatch ? scribeSessionMatch.id : undefined,
      renderingProviderName,
      renderingProviderNpi,
      billingProviderName,
      billingProviderNpi,
      billingProviderTaxId,
      billingProviderAddress,
      placeOfService,
      serviceDate,
      diagnosisCodes: diagnoses.filter((d) => d.code.trim().length > 0),
      lines: lines.map((l) => ({
        ...l,
        chargeAmount: Number(l.chargeAmount) || 0,
        units: Number(l.units) || 1,
      })),
      totalCharge,
      amountPaid: 0,
      status: status,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    saveClaim(newClaim);
    onClaimCreated(newClaim, autoOpenSubmit);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[1000] overflow-hidden bg-slate-900/60 backdrop-blur-xs flex justify-end animate-in fade-in duration-200">
      <div className="w-full max-w-3xl bg-white h-full shadow-2xl flex flex-col border-l border-slate-200 overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center font-bold shadow-xs">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900" style={{ fontFamily: "Outfit, sans-serif" }}>
                {claimToEdit ? `Edit Claim ${claimToEdit.claimNumber}` : "Create Insurance Claim"}
              </h3>
              <p className="text-xs text-slate-500">
                {claimToEdit
                  ? `Update CPT codes, ICD-10 diagnosis, or provider information for claim ${claimToEdit.claimNumber}`
                  : "Seamlessly links Client • Encounter (Appointment) • Billing Invoice"}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-200/60 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Form Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Step 1: Linkage: Client -> Encounter (Appointment Title) -> Invoice */}
          <div className="bg-gradient-to-r from-blue-50/70 via-indigo-50/40 to-slate-50/80 border border-blue-200/80 rounded-2xl p-4.5 shadow-xs">
            <div className="flex items-center justify-between mb-3.5">
              <span className="text-xs font-bold text-blue-950 flex items-center gap-1.5" style={{ fontFamily: "Outfit, sans-serif" }}>
                <Link2 className="w-4 h-4 text-blue-600" />
                Step 1: Link Client Encounter &amp; Billing Records
              </span>
              <span className="text-[11px] text-blue-700 bg-blue-100/70 px-2.5 py-0.5 rounded-full font-medium flex items-center gap-1">
                <Check className="w-3 h-3 text-blue-600" />
                Auto-fill Demographics &amp; CPT Codes
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {/* 1. Choose Client */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5 text-blue-600" />
                  1. Client / Patient
                </label>
                <select
                  value={selectedClientId}
                  onChange={(e) => handleSelectClient(e.target.value)}
                  className="w-full text-xs font-medium px-3 py-2 bg-white border border-blue-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400 text-slate-800"
                >
                  <option value="">-- Choose Client --</option>
                  {clients.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.id || c.phone || "Client"})
                    </option>
                  ))}
                </select>
              </div>

              {/* 2. Available Encounter (Appointment Title) */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-indigo-600" />
                  2. Encounter (Appt Title)
                </label>
                <select
                  value={selectedAppointmentId}
                  onChange={(e) => handleSelectAppointment(e.target.value)}
                  className="w-full text-xs font-medium px-3 py-2 bg-white border border-blue-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-400 text-slate-800"
                >
                  <option value="">-- Choose Encounter --</option>
                  {availableAppointments.length === 0 ? (
                    <option value="" disabled>No appointments found for client</option>
                  ) : (
                    availableAppointments.map((apt) => {
                      const encounterTitle = apt.title || apt.serviceName || apt.notes || "Clinical Encounter";
                      return (
                        <option key={apt.id} value={apt.id}>
                          {encounterTitle} &bull; {apt.date} ({apt.time || "10:00"})
                        </option>
                      );
                    })
                  )}
                </select>
              </div>

              {/* 3. Invoice against that appointment */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1.5">
                  <Receipt className="w-3.5 h-3.5 text-emerald-600" />
                  3. Invoice Against Encounter
                </label>
                <select
                  value={selectedInvoiceId}
                  onChange={(e) => handleSelectInvoice(e.target.value)}
                  className="w-full text-xs font-medium px-3 py-2 bg-white border border-blue-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-400 text-slate-800"
                >
                  <option value="">-- No Invoice / Standalone --</option>
                  {availableInvoices.map(({ invoice: inv, isDirectAppointmentMatch }) => (
                    <option key={inv.id} value={inv.id}>
                      {isDirectAppointmentMatch ? "⭐ [Encounter Invoice] " : ""}{inv.invoiceNumber || inv.id} &bull; ${Number(inv.total).toFixed(2)} ({inv.statusLabel || inv.status || "Active"})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Visual Confirmation Chips / Feedback Cards */}
            {(selectedAppointment || selectedInvoice || scribeSessionMatch) && (
              <div className="mt-3.5 pt-3 border-t border-blue-100 flex flex-col sm:flex-row flex-wrap items-center gap-2">
                {selectedAppointment && (
                  <div className="inline-flex items-center gap-1.5 text-[11px] bg-white border border-blue-200/90 px-2.5 py-1 rounded-lg text-slate-700 shadow-2xs">
                    <Calendar className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                    <span>Encounter:</span>
                    <strong className="text-slate-900 font-semibold truncate max-w-[180px]">
                      {selectedAppointment.title || selectedAppointment.serviceName || "Clinical Encounter"}
                    </strong>
                    <span className="text-slate-400">&bull;</span>
                    <span className="text-slate-600">{selectedAppointment.date}</span>
                  </div>
                )}

                {selectedInvoice && (
                  <div className="inline-flex items-center gap-1.5 text-[11px] bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-lg text-emerald-900 shadow-2xs">
                    <Receipt className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    <span>Invoice:</span>
                    <strong className="font-semibold">{selectedInvoice.invoiceNumber || selectedInvoice.id}</strong>
                    <span className="text-emerald-400">&bull;</span>
                    <span className="font-bold text-emerald-700">${Number(selectedInvoice.total).toFixed(2)}</span>
                    {selectedInvoice.lineItems?.length > 0 && (
                      <span className="text-[10px] bg-emerald-100 text-emerald-800 px-1.5 py-0.2 rounded font-medium ml-1">
                        {selectedInvoice.lineItems.length} lines synced
                      </span>
                    )}
                  </div>
                )}

                {scribeSessionMatch && (
                  <div className="inline-flex items-center gap-1.5 text-[11px] bg-purple-50 border border-purple-200 px-2.5 py-1 rounded-lg text-purple-900 shadow-2xs">
                    <Sparkles className="w-3.5 h-3.5 text-purple-600 shrink-0" />
                    <span>AI Scribe Note:</span>
                    <strong className="font-mono text-purple-950">
                      {scribeSessionMatch.extractedData.icd10Code || "H25.11"}
                    </strong>
                    <span className="text-purple-400">&bull;</span>
                    <span className="text-purple-700 truncate max-w-[120px]">
                      {scribeSessionMatch.extractedData.diagnosis}
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Patient Details */}
          <div className="border border-slate-200 rounded-2xl p-4 bg-white space-y-3">
            <span className="text-xs font-bold text-slate-900 flex items-center gap-1.5 uppercase tracking-wider" style={{ fontFamily: "Outfit, sans-serif" }}>
              <User className="w-4 h-4 text-slate-600" />
              Patient Demographics
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              <div>
                <label className="block text-slate-500 mb-1">Patient Full Name</label>
                <input
                  type="text"
                  value={patientName}
                  onChange={(e) => setPatientName(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs font-semibold focus:outline-none focus:border-blue-500"
                  placeholder="e.g. Sarah Johnson"
                />
              </div>
              <div>
                <label className="block text-slate-500 mb-1">Date of Birth</label>
                <input
                  type="date"
                  value={patientDob}
                  onChange={(e) => setPatientDob(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs focus:outline-none focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-slate-500 mb-1">Gender</label>
                <select
                  value={patientGender}
                  onChange={(e) => setPatientGender(e.target.value as any)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs focus:outline-none focus:border-blue-500"
                >
                  <option value="Female">Female</option>
                  <option value="Male">Male</option>
                  <option value="Other">Other</option>
                </select>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div>
                <label className="block text-slate-500 mb-1">Patient Phone</label>
                <input
                  type="text"
                  value={patientPhone}
                  onChange={(e) => setPatientPhone(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs focus:outline-none focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-slate-500 mb-1">Address</label>
                <input
                  type="text"
                  value={patientAddress}
                  onChange={(e) => setPatientAddress(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>
          </div>

          {/* Insurance Payer & Policy */}
          <div className="border border-slate-200 rounded-2xl p-4 bg-white space-y-3">
            <span className="text-xs font-bold text-slate-900 flex items-center gap-1.5 uppercase tracking-wider" style={{ fontFamily: "Outfit, sans-serif" }}>
              <Shield className="w-4 h-4 text-slate-600" />
              Insurance Payer &amp; Coverage
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              <div>
                <label className="block text-slate-500 mb-1">Insurance Carrier / Payer</label>
                <select
                  value={selectedPayerId}
                  onChange={(e) => setSelectedPayerId(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs font-semibold focus:outline-none focus:border-blue-500"
                >
                  {POPULAR_PAYERS.map((payer) => (
                    <option key={payer.id} value={payer.id}>
                      {payer.name} ({payer.payerId}) - {payer.type}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-slate-500 mb-1">Insured / Member ID</label>
                <input
                  type="text"
                  value={insuredId}
                  onChange={(e) => setInsuredId(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs font-mono font-bold focus:outline-none focus:border-blue-500"
                  placeholder="e.g. BCBS-9842100"
                />
              </div>
              <div>
                <label className="block text-slate-500 mb-1">Group Number</label>
                <input
                  type="text"
                  value={groupNumber}
                  onChange={(e) => setGroupNumber(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs font-mono focus:outline-none focus:border-blue-500"
                  placeholder="e.g. GRP-4402"
                />
              </div>
            </div>
          </div>

          {/* Diagnoses (ICD-10) */}
          <div className="border border-slate-200 rounded-2xl p-4 bg-white space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-900 flex items-center gap-1.5 uppercase tracking-wider" style={{ fontFamily: "Outfit, sans-serif" }}>
                <Activity className="w-4 h-4 text-emerald-600" />
                Diagnosis Codes (ICD-10-CM &bull; CMS-1500 Box 21)
              </span>
              {diagnoses.length < 4 && (
                <button
                  type="button"
                  onClick={handleAddDiagnosis}
                  className="text-xs text-emerald-600 hover:text-emerald-700 font-semibold inline-flex items-center gap-1 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" /> Add Secondary Diagnosis
                </button>
              )}
            </div>

            <div className="space-y-2.5">
              {diagnoses.map((diag, index) => (
                <div key={diag.pointer} className="flex items-start gap-2 bg-slate-50/80 p-2.5 rounded-xl border border-slate-200">
                  <div className="w-6 h-6 rounded-md bg-emerald-100 text-emerald-800 font-bold text-xs flex items-center justify-center shrink-0 mt-1">
                    {diag.pointer}
                  </div>
                  <div className="w-44 shrink-0">
                    <ICDCodeInput
                      value={diag.code}
                      onChange={(code) => handleDiagnosisCodeChange(index, code)}
                      placeholder="e.g. F41.1, H25.11"
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <input
                      type="text"
                      value={diag.description}
                      onChange={(e) => {
                        const updated = [...diagnoses];
                        updated[index].description = e.target.value;
                        setDiagnoses(updated);
                      }}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs bg-white focus:outline-none focus:border-emerald-500"
                      placeholder="Diagnosis description"
                    />
                  </div>
                  {diagnoses.length > 1 && (
                    <button
                      type="button"
                      onClick={() => handleRemoveDiagnosis(index)}
                      className="p-2 text-slate-400 hover:text-red-600 rounded-lg hover:bg-red-50 transition-colors cursor-pointer shrink-0"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Service Lines (CPT) */}
          <div className="border border-slate-200 rounded-2xl p-4 bg-white space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-900 flex items-center gap-1.5 uppercase tracking-wider" style={{ fontFamily: "Outfit, sans-serif" }}>
                <FileCheck className="w-4 h-4 text-blue-600" />
                Service Lines (CPT / HCPCS Procedures &bull; Box 24)
              </span>
              <button
                type="button"
                onClick={handleAddLine}
                className="text-xs text-blue-600 hover:text-blue-700 font-semibold inline-flex items-center gap-1 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" /> Add Service Line
              </button>
            </div>

            <div className="space-y-3">
              {lines.map((line) => (
                <div key={line.id} className="p-3 bg-slate-50/80 border border-slate-200 rounded-xl space-y-2">
                  <div className="grid grid-cols-12 gap-2 text-xs">
                    <div className="col-span-3">
                      <label className="block text-[11px] text-slate-500 mb-1">Date of Service</label>
                      <input
                        type="date"
                        value={line.serviceDate}
                        onChange={(e) => handleLineChange(line.id, "serviceDate", e.target.value)}
                        className="w-full px-2 py-1.5 border border-slate-200 rounded-lg text-xs bg-white"
                      />
                    </div>
                    <div className="col-span-5">
                      <label className="block text-[11px] text-slate-500 mb-1">CPT / HCPCS Code</label>
                      <CPTCodeInput
                        value={line.cptCode}
                        onChange={(code) => handleLineChange(line.id, "cptCode", code)}
                        placeholder="e.g. 90834, 99213"
                      />
                    </div>
                    <div className="col-span-2">
                      <label className="block text-[11px] text-slate-500 mb-1">Modifier</label>
                      <input
                        type="text"
                        value={line.modifier || ""}
                        onChange={(e) => handleLineChange(line.id, "modifier", e.target.value)}
                        placeholder="e.g. 25, 95"
                        className="w-full px-2 py-2 border border-slate-200 rounded-lg text-xs font-mono uppercase bg-white"
                      />
                    </div>
                    <div className="col-span-2">
                      <label className="block text-[11px] text-slate-500 mb-1">Diag Pointer</label>
                      <input
                        type="text"
                        value={line.diagnosisPointer}
                        onChange={(e) => handleLineChange(line.id, "diagnosisPointer", e.target.value)}
                        placeholder="A, B"
                        className="w-full px-2 py-2 border border-slate-200 rounded-lg text-xs font-mono font-bold text-center uppercase bg-white"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-12 gap-2 items-center text-xs">
                    <div className="col-span-7">
                      <input
                        type="text"
                        value={line.description}
                        onChange={(e) => handleLineChange(line.id, "description", e.target.value)}
                        placeholder="Service description"
                        className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs bg-white"
                      />
                    </div>
                    <div className="col-span-2">
                      <div className="flex items-center">
                        <span className="text-[11px] text-slate-500 mr-1">Qty:</span>
                        <input
                          type="number"
                          min="1"
                          value={line.units}
                          onChange={(e) => handleLineChange(line.id, "units", parseInt(e.target.value) || 1)}
                          className="w-full px-2 py-1.5 border border-slate-200 rounded-lg text-xs text-center bg-white"
                        />
                      </div>
                    </div>
                    <div className="col-span-2">
                      <div className="relative">
                        <span className="absolute left-2 top-1.5 text-slate-400">$</span>
                        <input
                          type="number"
                          step="0.01"
                          value={line.chargeAmount}
                          onChange={(e) => handleLineChange(line.id, "chargeAmount", parseFloat(e.target.value) || 0)}
                          className="w-full pl-5 pr-2 py-1.5 border border-slate-200 rounded-lg text-xs font-semibold text-right bg-white"
                        />
                      </div>
                    </div>
                    <div className="col-span-1 text-right">
                      {lines.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveLine(line.id)}
                          className="p-1.5 text-slate-400 hover:text-red-600 rounded-lg hover:bg-red-50 cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Financial Summary Strip */}
            <div className="flex justify-between items-center p-3 bg-blue-50/50 rounded-xl border border-blue-100">
              <span className="text-xs text-slate-600 font-medium">Total Claim Amount:</span>
              <span className="text-base font-bold font-mono text-slate-900" style={{ fontFamily: "Outfit, sans-serif" }}>
                ${totalCharge.toFixed(2)}
              </span>
            </div>
          </div>

          {/* Provider & Place of Service */}
          <div className="border border-slate-200 rounded-2xl p-4 bg-white space-y-3">
            <span className="text-xs font-bold text-slate-900 flex items-center gap-1.5 uppercase tracking-wider" style={{ fontFamily: "Outfit, sans-serif" }}>
              <FileCheck className="w-4 h-4 text-slate-600" />
              Provider Details &amp; Place of Service
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              <div>
                <label className="block text-slate-500 mb-1">Rendering Provider</label>
                <input
                  type="text"
                  value={renderingProviderName}
                  onChange={(e) => setRenderingProviderName(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs focus:outline-none focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-slate-500 mb-1">Rendering NPI</label>
                <input
                  type="text"
                  value={renderingProviderNpi}
                  onChange={(e) => setRenderingProviderNpi(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs font-mono focus:outline-none focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-slate-500 mb-1">Place of Service</label>
                <select
                  value={placeOfService}
                  onChange={(e) => setPlaceOfService(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs focus:outline-none focus:border-blue-500"
                >
                  <option value="11 - Office">11 - Office</option>
                  <option value="02 - Telehealth">02 - Telehealth</option>
                  <option value="22 - Outpatient Hospital">22 - Outpatient Hospital</option>
                  <option value="12 - Home">12 - Home</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between shrink-0">
          <Button variant="outline" size="sm" onClick={onClose}>
            Cancel
          </Button>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleSave("Draft", false)}
              className="text-xs text-slate-700"
            >
              {claimToEdit ? "Update Draft" : "Save as Draft"}
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => handleSave("Ready to Submit", false)}
              className="text-xs"
            >
              {claimToEdit ? "Update as Ready" : "Mark Ready"}
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={() => handleSave("Ready to Submit", true)}
              className="text-xs bg-blue-600 hover:bg-blue-700 text-white shadow-xs"
            >
              {claimToEdit ? "Update & Submit Claim →" : "Save & Submit Claim →"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
