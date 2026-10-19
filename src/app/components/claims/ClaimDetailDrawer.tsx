import React, { useState, useEffect, useMemo } from "react";
import {
  X,
  Shield,
  FileText,
  Calendar,
  CheckCircle2,
  Clock,
  Send,
  Plus,
  Layers,
  Settings,
  Copy,
  Check,
  ExternalLink,
  Download,
  Printer,
  Sparkles,
  Receipt,
  FileCheck,
  AlertCircle,
  HelpCircle,
  Edit,
  Trash2,
} from "lucide-react";
import {
  Claim,
  ClaimStatus,
  ClaimDiagnosisCode,
  ClaimServiceLine,
  getStoredClaims,
  saveClaim,
  generateClaimNumber,
  moveClaimToStage,
  submitClaimElectronically,
  CLAIMS_CHANGED_EVENT,
} from "../../../lib/claimsStore";
import { ChevronStageRibbon } from "../common/ChevronStageRibbon";
import DraggableOverviewSections, { OverviewSection } from "../profile/DraggableOverviewSections";
import ActivityTab, { ActivityLogEntry } from "../activity/ActivityTab";
import DocumentsTab from "../profile/DocumentsTab";
import {
  useFieldRegistry,
  FieldDefinition,
  SectionDefinition,
  SECTION_REGISTRY_EVENT,
  FIELD_REGISTRY_EVENT,
} from "../../context/FieldRegistryContext";
import { useOrganization } from "../../context/OrganizationContext";
import { getStoredProcesses, DEFAULT_ENTITY_PROCESSES, Process, Stage } from "../../../lib/useProcessStore";
import { appendActivity, getActivity, subscribeToActivity } from "../../../lib/activityEngine";
import { SelectFieldsModal, CreateFieldModal } from "../help/FieldManager";
import { AdminSectionDrawer } from "../../pages/admin/components/AdminSectionDrawer";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "../ui/dropdown-menu";
import { toast } from "sonner";


export interface ClaimDetailDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  claim: Claim | null;
  isCreateMode?: boolean;
  onEditClaim?: (claim: Claim) => void;
  onOpenCMS1500?: (claim: Claim) => void;
  onClaimCreated?: (createdClaim: Claim) => void;
}

const DEFAULT_CLAIM_SECTIONS: OverviewSection[] = [
  {
    id: "sec-clm-details",
    title: "Claim Details",
    description: "Claim ID, service date, billed amount, and submission type",
    iconName: "file-text",
    source: "system",
    module: "claim",
    fieldKeys: [
      "claim_number",
      "service_date",
      "billed_amount",
      "claim_type",
      "place_of_service",
    ],
  },
  {
    id: "sec-clm-patient",
    title: "Patient & Policy Information",
    description: "Patient coordinates, insurance payer, and coverage policy",
    iconName: "user",
    source: "system",
    module: "claim",
    fieldKeys: [
      "client_name",
      "client_email",
      "client_phone",
      "patient_dob",
      "payer_name",
      "policy_number",
      "group_number",
    ],
  },
  {
    id: "sec-clm-billing",
    title: "Billing & Diagnosis (ICD-10 / CPT)",
    description: "Diagnosis codes, procedure codes, prior auth, and billing provider",
    iconName: "table",
    source: "system",
    module: "claim",
    fieldKeys: [
      "diagnosis_codes",
      "procedure_codes",
      "provider_npi",
      "prior_auth_number",
      "allowed_amount",
      "paid_amount",
    ],
  },
];

const createEmptyClaim = (): Claim => {
  return {
    id: `clm-${Date.now()}`,
    claimNumber: generateClaimNumber(),
    patientId: "",
    patientName: "",
    patientDob: "",
    patientGender: "Female",
    patientAddress: "",
    patientPhone: "",
    insuredId: "",
    groupNumber: "",
    payer: {
      id: "payer-1",
      name: "",
      payerId: "",
      type: "Commercial",
    },
    serviceDate: new Date().toISOString().slice(0, 10),
    placeOfService: "11 - Office",
    submissionMethod: "clearinghouse",
    status: "Draft",
    statusLabel: "Draft & Intake",
    totalCharge: 0,
    amountPaid: 0,
    lines: [],
    diagnosisCodes: [],
    renderingProviderName: "",
    renderingProviderNpi: "",
    billingProviderName: "",
    billingProviderNpi: "",
    billingProviderTaxId: "XX-XXX4912",
    billingProviderAddress: "100 Medical Center Way, Suite 400, Chicago, IL 60601",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
};

export default function ClaimDetailDrawer({
  isOpen,
  onClose,
  claim,
  isCreateMode = false,
  onEditClaim,
  onOpenCMS1500,
  onClaimCreated,
}: ClaimDetailDrawerProps) {
  const { activeOrganization } = useOrganization();
  const { getSectionsForOrg, getFieldsForOrg, addCustomSection, updateCustomSection } = useFieldRegistry();

  // Active Tab
  const [activeTab, setActiveTab] = useState<"overview" | "documents" | "billing">("overview");
  const [copiedId, setCopiedId] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Field Management Modals
  const [fieldManagerOpen, setFieldManagerOpen] = useState(false);
  const [fieldManagerMode, setFieldManagerMode] = useState<"select" | "create">("select");
  const [sectionDrawerOpen, setSectionDrawerOpen] = useState(false);
  const [editingSection, setEditingSection] = useState<SectionDefinition | null>(null);

  // Live Claim state
  const [liveClaim, setLiveClaim] = useState<Claim | null>(() => {
    if (claim) return claim;
    if (isCreateMode) return createEmptyClaim();
    return null;
  });

  useEffect(() => {
    if (claim) {
      setLiveClaim(claim);
    } else if (isOpen && isCreateMode) {
      setLiveClaim(createEmptyClaim());
    } else {
      setLiveClaim(null);
    }
  }, [claim, isOpen, isCreateMode]);

  // Sync when claim is modified elsewhere
  useEffect(() => {
    const handleClaimsChange = () => {
      if (!claim?.id) return;
      const all = getStoredClaims();
      const found = all.find((c) => c.id === claim.id);
      if (found) setLiveClaim(found);
    };
    window.addEventListener(CLAIMS_CHANGED_EVENT, handleClaimsChange);
    window.addEventListener("storage", handleClaimsChange);
    return () => {
      window.removeEventListener(CLAIMS_CHANGED_EVENT, handleClaimsChange);
      window.removeEventListener("storage", handleClaimsChange);
    };
  }, [claim?.id]);

  // Insurance Process & Stages
  const insuranceProcess: Process = useMemo(() => {
    const procs = getStoredProcesses();
    const insProcs = procs.filter((p) => p.entityType === "insurance");
    return insProcs[0] || DEFAULT_ENTITY_PROCESSES.insurance;
  }, []);

  const claimStages: Stage[] = useMemo(() => {
    return insuranceProcess.stages || DEFAULT_ENTITY_PROCESSES.insurance.stages;
  }, [insuranceProcess]);

  // Current stage resolution
  const currentClaimStage = useMemo(() => {
    if (!liveClaim) return claimStages[0];
    if (liveClaim.currentStageId) {
      const match = claimStages.find((s) => s.id === liveClaim.currentStageId);
      if (match) return match;
    }
    if (liveClaim.statusLabel) {
      const match = claimStages.find((s) => s.name.toLowerCase() === liveClaim.statusLabel?.toLowerCase());
      if (match) return match;
    }
    const matchCat = claimStages.find(
      (s) => s.systemCategory === liveClaim.status || s.name.toLowerCase() === (liveClaim.status || "").toLowerCase()
    );
    return matchCat || claimStages[0];
  }, [liveClaim, claimStages]);

  // Client ID fallback
  const effectiveClientId = useMemo(() => {
    if (!liveClaim) return "client-default";
    return liveClaim.patientId || `patient-${liveClaim.id}`;
  }, [liveClaim]);

  // Formatted Claim Title
  const claimTitle = useMemo(() => {
    if (isCreateMode || !liveClaim?.patientName) {
      return "New Insurance Claim";
    }
    const patientName = liveClaim.patientName || "Client";
    const dateStr = liveClaim.serviceDate || (liveClaim.createdAt ? liveClaim.createdAt.slice(0, 10) : "2026-10-15");
    return `${patientName}_Claim_${dateStr}`;
  }, [liveClaim, isCreateMode]);

  // Local storage key for custom section configuration
  const claimSectionsStorageKey = useMemo(() => {
    return `mantra_claim_sections_${activeOrganization?.id || "default"}`;
  }, [activeOrganization?.id]);

  // Load custom sections without sec-clm-custom
  const [claimSections, setClaimSections] = useState<OverviewSection[]>(() => {
    try {
      const saved = localStorage.getItem(claimSectionsStorageKey);
      if (saved) {
        const parsed: OverviewSection[] = JSON.parse(saved);
        const filtered = parsed.filter((s) => s.id !== "sec-clm-custom");
        if (filtered.length > 0) return filtered;
      }
    } catch {}
    return DEFAULT_CLAIM_SECTIONS;
  });

  // Re-sync registered sections
  useEffect(() => {
    try {
      const registeredSecs = getSectionsForOrg("claim", activeOrganization);
      if (registeredSecs && registeredSecs.length > 0) {
        setClaimSections((prev) => {
          const merged = prev.filter((s) => s.id !== "sec-clm-custom");
          registeredSecs.forEach((rs) => {
            if (rs.id !== "sec-clm-custom" && !merged.some((s) => s.id === rs.id)) {
              merged.push({
                id: rs.id,
                title: rs.title,
                description: rs.description,
                iconName: rs.iconName as any || "layers",
                source: rs.source || "custom",
                module: "claim",
                fieldKeys: rs.fieldKeys || [],
                isCustom: rs.source === "custom",
              });
            }
          });
          return merged;
        });
      }
    } catch {}
  }, [getSectionsForOrg, activeOrganization]);

  const handleSectionsChange = (newSections: OverviewSection[]) => {
    const cleaned = newSections.filter((s) => s.id !== "sec-clm-custom");
    setClaimSections(cleaned);
    try {
      localStorage.setItem(claimSectionsStorageKey, JSON.stringify(cleaned));
    } catch {}
  };

  // Field Values state
  const [fieldValues, setFieldValues] = useState<Record<string, any>>({});

  useEffect(() => {
    if (!liveClaim) return;
    if (isCreateMode) {
      setFieldValues({
        claim_number: liveClaim.claimNumber,
        service_date: liveClaim.serviceDate || new Date().toISOString().slice(0, 10),
        billed_amount: "",
        claim_type: "Professional (CMS-1500 / 837P)",
        place_of_service: liveClaim.placeOfService || "11 - Office",
        client_name: "",
        patient_dob: "",
        client_phone: "",
        client_email: "",
        payer_name: "",
        policy_number: "",
        group_number: "",
        diagnosis_codes: "",
        procedure_codes: "",
        provider_npi: "",
        prior_auth_number: "",
        allowed_amount: "",
        paid_amount: "",
      });
      return;
    }

    const initialValues: Record<string, any> = {
      claim_number: liveClaim.claimNumber || "",
      service_date: liveClaim.serviceDate || "",
      billed_amount: liveClaim.totalCharge ? liveClaim.totalCharge : "",
      claim_type: liveClaim.submissionMethod === "clearinghouse" ? "Professional (837P)" : "CMS-1500 Paper",
      place_of_service: liveClaim.placeOfService || "11 - Office",
      client_name: liveClaim.patientName || "",
      patient_dob: liveClaim.patientDob || "",
      client_phone: liveClaim.patientPhone || "",
      client_email: liveClaim.patientId ? `${liveClaim.patientId.toLowerCase()}@example.com` : "",
      payer_name: liveClaim.payer?.name || "",
      policy_number: liveClaim.insuredId || "",
      group_number: liveClaim.groupNumber || "",
      diagnosis_codes: (liveClaim.diagnosisCodes || []).map((d) => d.code).join(", "),
      procedure_codes: (liveClaim.lines || []).map((l) => l.cptCode).join(", "),
      provider_npi: liveClaim.billingProviderNpi || "",
      prior_auth_number: "",
      allowed_amount: liveClaim.totalCharge > 0 ? (liveClaim.totalCharge * 0.85).toFixed(2) : "",
      paid_amount: liveClaim.amountPaid || "",
    };

    try {
      const customSaved = localStorage.getItem(`mantra_claim_fieldvalues_${liveClaim.id}`);
      if (customSaved) {
        Object.assign(initialValues, JSON.parse(customSaved));
      }
    } catch {}

    setFieldValues(initialValues);
  }, [liveClaim, isCreateMode]);

  const handleFieldValueChange = (key: string, value: any) => {
    setFieldValues((prev) => {
      const next = { ...prev, [key]: value };
      if (!isCreateMode && liveClaim?.id) {
        try {
          localStorage.setItem(`mantra_claim_fieldvalues_${liveClaim.id}`, JSON.stringify(next));
        } catch {}
      }
      return next;
    });

    if (key === "client_name") {
      setLiveClaim((prev) => (prev ? { ...prev, patientName: value } : prev));
    } else if (key === "billed_amount") {
      const num = parseFloat(value) || 0;
      setLiveClaim((prev) => (prev ? { ...prev, totalCharge: num } : prev));
    }
  };

  // Stage Progression Handler
  const handleStageSelect = (targetStage: Stage) => {
    if (!liveClaim || targetStage.id === currentClaimStage?.id) return;

    try {
      const updated = moveClaimToStage(liveClaim.id, targetStage.id, targetStage.name);
      if (updated) {
        setLiveClaim(updated);
      }

      const primaryId = liveClaim.patientId || effectiveClientId;
      appendActivity({
        clientId: primaryId,
        claimId: liveClaim.id,
        appointmentId: liveClaim.appointmentId ? String(liveClaim.appointmentId) : undefined,
        processId: insuranceProcess.id,
        processName: insuranceProcess.name,
        type: "stage_update" as any,
        refId: liveClaim.id,
        fromStage: currentClaimStage?.name || "Draft & Intake",
        toStage: targetStage.name,
        status: "completed",
        createdBy: "user",
        details: {
          primary: `Claim stage updated to "${targetStage.name}"`,
          secondary: `Moved from ${currentClaimStage?.name || "Draft & Intake"}`,
        },
      });

      toast.success(`Claim moved to "${targetStage.name}"`);
    } catch (e) {
      console.warn("[ClaimDetailDrawer] Failed to move stage:", e);
    }
  };

  // Activity logs subscription
  const [activities, setActivities] = useState<ActivityLogEntry[]>([]);
  useEffect(() => {
    if (!liveClaim) return;

    const candidateIds = [
      liveClaim.patientId,
      liveClaim.id,
      liveClaim.claimNumber,
      effectiveClientId,
    ].filter(Boolean) as string[];

    const load = () => {
      if (isCreateMode) {
        setActivities([]);
        return;
      }

      let list = getActivity(candidateIds, undefined, {
        claimId: liveClaim.id,
        appointmentId: liveClaim.appointmentId ? String(liveClaim.appointmentId) : undefined,
      });

      // If empty, populate baseline clinical and submission logs
      if (list.length === 0) {
        const baseTime = liveClaim.createdAt ? new Date(liveClaim.createdAt).getTime() : Date.now() - 3600000;

        // 1. Claim Created
        appendActivity({
          clientId: liveClaim.patientId || effectiveClientId,
          claimId: liveClaim.id,
          processId: insuranceProcess.id,
          processName: insuranceProcess.name,
          type: "status_change" as any,
          refId: liveClaim.id,
          status: "completed",
          createdBy: "user",
          timestamp: new Date(baseTime).toISOString(),
          details: {
            primary: `Claim ${liveClaim.claimNumber} prepared for ${liveClaim.patientName}`,
            secondary: `Payer: ${liveClaim.payer?.name} · Total Billed: $${(liveClaim.totalCharge || 0).toFixed(2)}`,
          },
        });

        // 2. Coverage Verified
        appendActivity({
          clientId: liveClaim.patientId || effectiveClientId,
          claimId: liveClaim.id,
          processId: insuranceProcess.id,
          processName: insuranceProcess.name,
          type: "document_generated" as any,
          refId: liveClaim.id,
          status: "completed",
          createdBy: "system",
          timestamp: new Date(baseTime + 180000).toISOString(),
          details: {
            primary: "Real-time 270/271 Eligibility Verified",
            secondary: `Policy #${liveClaim.insuredId} verified active with ${liveClaim.payer?.name}`,
          },
        });

        // 3. Stage Updated
        const activeStageName = currentClaimStage?.name || liveClaim.statusLabel || "Draft & Intake";
        appendActivity({
          clientId: liveClaim.patientId || effectiveClientId,
          claimId: liveClaim.id,
          processId: insuranceProcess.id,
          processName: insuranceProcess.name,
          type: "stage_update" as any,
          refId: liveClaim.id,
          fromStage: "Draft & Intake",
          toStage: activeStageName,
          status: "completed",
          createdBy: "system",
          timestamp: new Date(baseTime + 360000).toISOString(),
          details: {
            primary: `Claim stage updated to "${activeStageName}"`,
            secondary: `Current lifecycle: ${liveClaim.status}`,
          },
        });

        list = getActivity(candidateIds, undefined, {
          claimId: liveClaim.id,
          appointmentId: liveClaim.appointmentId ? String(liveClaim.appointmentId) : undefined,
        });
      }

      setActivities(list as any);
    };

    load();
    const unsub = subscribeToActivity(candidateIds, load, {
      claimId: liveClaim.id,
      appointmentId: liveClaim.appointmentId ? String(liveClaim.appointmentId) : undefined,
    });
    return unsub;
  }, [liveClaim?.id, liveClaim?.status, liveClaim?.currentStageId, effectiveClientId, insuranceProcess.name, currentClaimStage?.name, isCreateMode]);

  if (!isOpen || !liveClaim) return null;

  const handleCopyClaimId = () => {
    navigator.clipboard?.writeText(liveClaim.claimNumber);
    setCopiedId(true);
    toast.success("Claim ID copied to clipboard");
    setTimeout(() => setCopiedId(false), 2000);
  };

  const handleSaveClaim = (initialStatus: ClaimStatus = "Draft") => {
    if (!liveClaim) return;
    const clientName = (fieldValues.client_name || "").trim();

    // Parse diagnosis codes
    const diagString = fieldValues.diagnosis_codes || "";
    const diagCodes: ClaimDiagnosisCode[] = diagString
      ? diagString.split(",").map((c: string, idx: number) => ({
          pointer: (["A", "B", "C", "D"][idx] || "A") as any,
          code: c.trim(),
          description: `ICD-10 Code ${c.trim()}`,
        }))
      : [];

    // Parse procedure codes
    const procString = fieldValues.procedure_codes || "";
    const billedAmt = parseFloat(fieldValues.billed_amount) || 0;
    const procList = procString ? procString.split(",") : [];
    const serviceLines: ClaimServiceLine[] = procList.length > 0
      ? procList.map((p: string, idx: number) => ({
          id: `line-${Date.now()}-${idx}`,
          serviceDate: fieldValues.service_date || liveClaim.serviceDate,
          cptCode: p.trim(),
          description: `CPT Procedure ${p.trim()}`,
          diagnosisPointer: "A",
          chargeAmount: billedAmt / procList.length,
          units: 1,
        }))
      : [];

    const newClaim: Claim = {
      ...liveClaim,
      id: liveClaim.id || `clm-${Date.now()}`,
      claimNumber: liveClaim.claimNumber || generateClaimNumber(),
      patientName: clientName || "Unnamed Client",
      patientPhone: fieldValues.client_phone || "",
      patientDob: fieldValues.patient_dob || "",
      patientAddress: "",
      insuredId: fieldValues.policy_number || "",
      groupNumber: fieldValues.group_number || "",
      payer: {
        id: "payer-1",
        name: fieldValues.payer_name || "Self-Pay / Commercial",
        payerId: "PAY-001",
        type: "Commercial",
      },
      serviceDate: fieldValues.service_date || new Date().toISOString().slice(0, 10),
      placeOfService: fieldValues.place_of_service || "11 - Office",
      totalCharge: billedAmt,
      amountPaid: parseFloat(fieldValues.paid_amount) || 0,
      lines: serviceLines,
      diagnosisCodes: diagCodes,
      billingProviderNpi: fieldValues.provider_npi || "",
      status: initialStatus,
      statusLabel: initialStatus === "Draft" ? "Draft & Intake" : initialStatus,
      currentStageId: initialStatus === "Draft" ? claimStages[0]?.id : claimStages[1]?.id,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    saveClaim(newClaim);

    appendActivity({
      clientId: newClaim.patientId || newClaim.id,
      claimId: newClaim.id,
      processId: insuranceProcess.id,
      processName: insuranceProcess.name,
      type: "status_change" as any,
      refId: newClaim.id,
      status: "completed",
      createdBy: "user",
      timestamp: new Date().toISOString(),
      details: {
        primary: `Claim ${newClaim.claimNumber} created for ${newClaim.patientName}`,
        secondary: `Status: ${newClaim.status} · Billed: $${newClaim.totalCharge.toFixed(2)}`,
      },
    });

    toast.success(`Claim ${newClaim.claimNumber} created successfully! ✓`);
    if (onClaimCreated) {
      onClaimCreated(newClaim);
    }
    onClose();
  };

  const handleSaveExistingChanges = () => {
    if (!liveClaim) return;
    const clientName = (fieldValues.client_name || "").trim();
    const billedAmt =
      fieldValues.billed_amount !== undefined && fieldValues.billed_amount !== ""
        ? parseFloat(fieldValues.billed_amount) || 0
        : liveClaim.totalCharge;

    const updated: Claim = {
      ...liveClaim,
      patientName: clientName || liveClaim.patientName,
      patientPhone: fieldValues.client_phone ?? liveClaim.patientPhone,
      patientDob: fieldValues.patient_dob ?? liveClaim.patientDob,
      insuredId: fieldValues.policy_number ?? liveClaim.insuredId,
      groupNumber: fieldValues.group_number ?? liveClaim.groupNumber,
      payer: {
        ...liveClaim.payer,
        name: fieldValues.payer_name || liveClaim.payer?.name,
      },
      serviceDate: fieldValues.service_date || liveClaim.serviceDate,
      placeOfService: fieldValues.place_of_service || liveClaim.placeOfService,
      totalCharge: billedAmt,
      billingProviderNpi: fieldValues.provider_npi || liveClaim.billingProviderNpi,
      updatedAt: new Date().toISOString(),
    };

    saveClaim(updated);
    setLiveClaim(updated);
    toast.success("Claim changes saved ✓");
  };

  const handleSubmitClearinghouse = async () => {
    setIsSubmitting(true);
    try {
      const updated = await submitClaimElectronically(liveClaim.id);
      setLiveClaim(updated);
      toast.success("Electronic 837P Claim successfully transmitted to Clearinghouse!");
    } catch (err: any) {
      toast.error(err.message || "Clearinghouse transmission failed");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden flex justify-end bg-black/40 backdrop-blur-xs animate-in fade-in duration-200">
      <div
        className="w-full bg-white h-full shadow-2xl flex flex-col border-l border-slate-200 overflow-hidden animate-in slide-in-from-right duration-300"
        style={{
          width: "68vw",
          minWidth: "780px",
          maxWidth: "1150px",
        }}
      >
        {/* ── Top Header (DESIGN.md Light Architectural Standard) ── */}
        <div className="flex-shrink-0 bg-white px-7 py-3.5 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 shadow-xs">
              <Shield className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs font-bold text-slate-900 tracking-wider">
                  {liveClaim.claimNumber}
                </span>
                <button
                  type="button"
                  onClick={handleCopyClaimId}
                  className="text-slate-400 hover:text-slate-600 transition-colors p-0.5"
                  title="Copy Claim ID"
                >
                  {copiedId ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
                <span
                  className="text-[11px] font-semibold px-2 py-0.5 rounded-full flex items-center gap-1 border"
                  style={{
                    backgroundColor: `${currentClaimStage.color || "#3B82F6"}18`,
                    color: currentClaimStage.color || "#3B82F6",
                    borderColor: `${currentClaimStage.color || "#3B82F6"}40`,
                    fontFamily: "Outfit, sans-serif",
                  }}
                >
                  <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: currentClaimStage.color || "#3B82F6" }} />
                  {currentClaimStage.name}
                </span>
              </div>
              <h2 className="text-base font-bold text-slate-800 truncate max-w-md mt-0.5" style={{ fontFamily: "DM Sans, sans-serif" }}>
                {claimTitle}
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {isCreateMode ? (
              <>
                <button
                  type="button"
                  onClick={() => handleSaveClaim("Draft")}
                  className="h-8 px-3 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
                  style={{ fontFamily: "Outfit, sans-serif" }}
                >
                  <span>Save as Draft</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleSaveClaim("Ready to Submit")}
                  className="h-8 px-3.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
                  style={{ fontFamily: "Outfit, sans-serif" }}
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Create Claim</span>
                </button>
              </>
            ) : (
              <>
                <button
                  type="button"
                  onClick={handleSaveExistingChanges}
                  className="h-8 px-3 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
                  style={{ fontFamily: "Outfit, sans-serif" }}
                  title="Save any edits made to fields"
                >
                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Save Changes</span>
                </button>

                {liveClaim.status !== "Submitted" && liveClaim.status !== "Paid" && (
                  <button
                    type="button"
                    onClick={handleSubmitClearinghouse}
                    disabled={isSubmitting}
                    className="h-8 px-3 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer disabled:opacity-50"
                    style={{ fontFamily: "Outfit, sans-serif" }}
                  >
                    {isSubmitting ? (
                      <>
                        <Clock className="w-3.5 h-3.5 animate-spin" />
                        <span>Transmitting...</span>
                      </>
                    ) : (
                      <>
                        <Send className="w-3.5 h-3.5" />
                        <span>Submit 837P</span>
                      </>
                    )}
                  </button>
                )}
              </>
            )}

            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors ml-1 cursor-pointer"
              title="Close Drawer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* ── Stage Progression Ribbon (Interactive Chevron) ── */}
        <div className="flex-shrink-0 bg-slate-50/70 border-b border-slate-200 px-7 py-2.5">
          <div className="flex items-center justify-between gap-3 mb-1.5">
            <span className="text-[10px] font-semibold tracking-wider text-slate-400 uppercase" style={{ fontFamily: "Outfit, sans-serif" }}>
              Insurance & Claims Workflow Stages
            </span>
            <span className="text-[11px] text-slate-500 font-medium">
              Click any stage to advance claim
            </span>
          </div>
          <ChevronStageRibbon
            stages={claimStages}
            activeStageId={currentClaimStage.id}
            activeStageName={currentClaimStage.name}
            onStageClick={(stg) => handleStageSelect(stg as Stage)}
          />
        </div>

        {/* ── Navigation Tabs Bar ── */}
        <div className="flex-shrink-0 bg-white border-b border-slate-200 px-7 flex items-center justify-between">
          <div className="flex items-center gap-1 -mb-px">
            <button
              type="button"
              onClick={() => setActiveTab("overview")}
              className={`py-3 px-4 text-xs font-semibold border-b-2 flex items-center gap-2 transition-colors cursor-pointer ${
                activeTab === "overview"
                  ? "border-blue-600 text-blue-600"
                  : "border-transparent text-slate-500 hover:text-slate-800"
              }`}
              style={{ fontFamily: "Outfit, sans-serif" }}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Overview</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("documents")}
              className={`py-3 px-4 text-xs font-semibold border-b-2 flex items-center gap-2 transition-colors cursor-pointer ${
                activeTab === "documents"
                  ? "border-blue-600 text-blue-600"
                  : "border-transparent text-slate-500 hover:text-slate-800"
              }`}
              style={{ fontFamily: "Outfit, sans-serif" }}
            >
              <FileText className="w-3.5 h-3.5" />
              <span>Documents</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("billing")}
              className={`py-3 px-4 text-xs font-semibold border-b-2 flex items-center gap-2 transition-colors cursor-pointer ${
                activeTab === "billing"
                  ? "border-blue-600 text-blue-600"
                  : "border-transparent text-slate-500 hover:text-slate-800"
              }`}
              style={{ fontFamily: "Outfit, sans-serif" }}
            >
              <Receipt className="w-3.5 h-3.5" />
              <span>CPT & Diagnoses</span>
            </button>
          </div>

          {/* Manage Fields & Custom Sections Dropdown */}
          {activeTab === "overview" && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  className="h-7 px-2.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 text-[11px] font-semibold flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
                  style={{ fontFamily: "Outfit, sans-serif" }}
                >
                  <Settings className="w-3 h-3 text-slate-500" />
                  <span>Configure Sections</span>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48 bg-white border border-slate-200 shadow-lg rounded-xl py-1">
                <DropdownMenuItem
                  onClick={() => {
                    setFieldManagerMode("select");
                    setFieldManagerOpen(true);
                  }}
                  className="text-xs px-3 py-2 cursor-pointer text-slate-700 hover:bg-slate-50 flex items-center gap-2"
                >
                  <Plus className="w-3.5 h-3.5 text-blue-600" />
                  <span>Add Registered Fields</span>
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => {
                    setFieldManagerMode("create");
                    setFieldManagerOpen(true);
                  }}
                  className="text-xs px-3 py-2 cursor-pointer text-slate-700 hover:bg-slate-50 flex items-center gap-2"
                >
                  <Plus className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Create Custom Field</span>
                </DropdownMenuItem>
                <DropdownMenuSeparator className="my-1 border-slate-100" />
                <DropdownMenuItem
                  onClick={() => {
                    setEditingSection(null);
                    setSectionDrawerOpen(true);
                  }}
                  className="text-xs px-3 py-2 cursor-pointer text-slate-700 hover:bg-slate-50 flex items-center gap-2"
                >
                  <Layers className="w-3.5 h-3.5 text-purple-600" />
                  <span>Add New Section</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>

        {/* ── Scrollable Body Area ── */}
        <div className="flex-1 overflow-y-auto bg-slate-50/50">
          {/* ─────────────────────────────────────────────────────────────
              TAB 1: OVERVIEW (Draggable Sections Left + Activity Feed Right)
             ───────────────────────────────────────────────────────────── */}
          {activeTab === "overview" && (
            <div className="p-6">
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                {/* LEFT COLUMN: Draggable Overview Sections & Custom Fields */}
                <div className="lg:col-span-5 space-y-5">
                  <DraggableOverviewSections
                    mode="claim"
                    customFieldsModule="claim"
                    sections={claimSections}
                    onSectionsChange={handleSectionsChange}
                    fieldValues={fieldValues}
                    onFieldValueChange={handleFieldValueChange}
                    client={{
                      id: effectiveClientId,
                      name: liveClaim.patientName || "",
                      phone: liveClaim.patientPhone || "",
                      email: fieldValues.client_email || "",
                    }}
                  />
                </div>

                {/* RIGHT COLUMN: Real-Time Activity Feed & Drawers */}
                <div className="lg:col-span-7">
                  <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs">
                    <ActivityTab
                      activity={activities}
                      clientId={effectiveClientId}
                      clientName={liveClaim.patientName || "Client"}
                      clientPhone={liveClaim.patientPhone}
                      claimId={liveClaim.id}
                      processId={insuranceProcess.id}
                      processName="Insurance and Claims"
                      onCloseParentDrawer={onClose}
                      emptyMessage={isCreateMode ? "No activity logs yet for this new claim. Save the claim to start tracking workflow history." : "No activity logs yet for this claim"}
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ─────────────────────────────────────────────────────────────
              TAB 2: DOCUMENTS (Templates, CMS-1500, EOB, Scoped Tab)
             ───────────────────────────────────────────────────────────── */}
          {activeTab === "documents" && (
            <div className="p-6 space-y-6">
              <DocumentsTab
                client={{
                  id: effectiveClientId,
                  name: liveClaim.patientName || "Patient",
                  email: "patient@example.com",
                  phone: liveClaim.patientPhone || "",
                }}
                processName="Insurance and Claims"
                title="Claim Documents & EDI"
                entityType="claim"
                entityId={liveClaim.id}
                claimData={liveClaim}
                hideClientDefaultDocs={true}
              />
            </div>
          )}

          {/* ─────────────────────────────────────────────────────────────
              TAB 3: CPT & DIAGNOSES (Medical Coding & Charges Breakdown)
             ───────────────────────────────────────────────────────────── */}
          {activeTab === "billing" && (
            <div className="p-6 space-y-6">
              {/* Financials & Payer Summary Card */}
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
                  <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block" style={{ fontFamily: "Outfit, sans-serif" }}>
                    Total Billed Charge
                  </span>
                  <span className="text-xl font-bold text-slate-900 mt-1 block" style={{ fontFamily: "DM Sans, sans-serif" }}>
                    ${(liveClaim.totalCharge || 0).toFixed(2)}
                  </span>
                </div>
                <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
                  <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block" style={{ fontFamily: "Outfit, sans-serif" }}>
                    Allowed Amount
                  </span>
                  <span className="text-xl font-bold text-blue-600 mt-1 block" style={{ fontFamily: "DM Sans, sans-serif" }}>
                    ${(liveClaim.totalCharge * 0.85).toFixed(2)}
                  </span>
                </div>
                <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
                  <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block" style={{ fontFamily: "Outfit, sans-serif" }}>
                    Amount Paid by Payer
                  </span>
                  <span className="text-xl font-bold text-emerald-600 mt-1 block" style={{ fontFamily: "DM Sans, sans-serif" }}>
                    ${(liveClaim.amountPaid || 0).toFixed(2)}
                  </span>
                </div>
                <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
                  <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block" style={{ fontFamily: "Outfit, sans-serif" }}>
                    Patient Responsibility
                  </span>
                  <span className="text-xl font-bold text-amber-600 mt-1 block" style={{ fontFamily: "DM Sans, sans-serif" }}>
                    ${Math.max(0, (liveClaim.totalCharge * 0.85) - (liveClaim.amountPaid || 0)).toFixed(2)}
                  </span>
                </div>
              </div>

              {/* Itemized CPT Procedure Codes Table */}
              <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs">
                <div className="px-5 py-3 border-b border-slate-100 flex items-center justify-between">
                  <h3 className="text-xs font-bold text-slate-800" style={{ fontFamily: "Outfit, sans-serif" }}>
                    Itemized Service Lines (CMS-1500 Box 24)
                  </h3>
                  <span className="text-[11px] text-slate-400 font-medium">
                    {(liveClaim.lines || []).length} Service Codes
                  </span>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50/80 text-slate-500 font-semibold border-b border-slate-100">
                      <tr>
                        <th className="py-2.5 px-4">Date</th>
                        <th className="py-2.5 px-4">CPT / HCPCS</th>
                        <th className="py-2.5 px-4">Description</th>
                        <th className="py-2.5 px-4 text-center">Diag Ptr</th>
                        <th className="py-2.5 px-4 text-center">Units</th>
                        <th className="py-2.5 px-4 text-right">Charge Amount</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {(liveClaim.lines || []).length === 0 ? (
                        <tr>
                          <td colSpan={6} className="py-8 text-center text-slate-400 text-xs">
                            No service lines added yet. Enter procedure codes in Overview or CMS-1500 form.
                          </td>
                        </tr>
                      ) : (
                        (liveClaim.lines || []).map((line, idx) => (
                          <tr key={line.id || idx} className="hover:bg-slate-50/50">
                            <td className="py-3 px-4 font-medium text-slate-600">{line.serviceDate}</td>
                            <td className="py-3 px-4 font-mono font-bold text-blue-600">{line.cptCode}</td>
                            <td className="py-3 px-4 text-slate-700 max-w-xs truncate">{line.description}</td>
                            <td className="py-3 px-4 text-center font-mono font-semibold text-slate-500">{line.diagnosisPointer}</td>
                            <td className="py-3 px-4 text-center font-medium text-slate-600">{line.units}</td>
                            <td className="py-3 px-4 text-right font-mono font-semibold text-slate-900">${(line.chargeAmount || 0).toFixed(2)}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Diagnosis Codes List */}
              <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs">
                <h3 className="text-xs font-bold text-slate-800 mb-3" style={{ fontFamily: "Outfit, sans-serif" }}>
                  Primary & Secondary Diagnoses (ICD-10)
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {(liveClaim.diagnosisCodes || []).length === 0 ? (
                    <div className="col-span-2 py-6 text-center text-slate-400 text-xs border border-dashed border-slate-200 rounded-lg">
                      No diagnosis codes added yet. Enter ICD-10 codes in the Overview tab.
                    </div>
                  ) : (
                    (liveClaim.diagnosisCodes || []).map((diag, i) => (
                      <div key={i} className="flex items-center gap-3 p-3 rounded-lg border border-slate-100 bg-slate-50/50">
                        <span className="w-6 h-6 rounded-md bg-blue-100 text-blue-700 font-bold font-mono text-xs flex items-center justify-center shrink-0">
                          {diag.pointer}
                        </span>
                        <div className="min-w-0">
                          <span className="font-mono text-xs font-bold text-slate-900 block">{diag.code}</span>
                          <span className="text-[11px] text-slate-500 truncate block">{diag.description}</span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Clearinghouse & EDI 837P Transmission Information */}
              <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-3">
                <h3 className="text-xs font-bold text-slate-800" style={{ fontFamily: "Outfit, sans-serif" }}>
                  Clearinghouse EDI 837P Electronic Gateway
                </h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-xs">
                  <div>
                    <span className="text-slate-400 block text-[11px]">Submission Method</span>
                    <span className="font-semibold text-slate-700 mt-0.5 block">{liveClaim.submissionMethod === "clearinghouse" ? "Electronic EDI 837P" : "Manual CMS-1500"}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[11px]">Tracking ID</span>
                    <span className="font-mono font-semibold text-slate-800 mt-0.5 block">{liveClaim.clearinghouseTrackingId || "Pending Transmission"}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[11px]">EDI Control #</span>
                    <span className="font-mono font-semibold text-slate-800 mt-0.5 block">{liveClaim.ediControlNumber || "000049219"}</span>
                  </div>
                </div>
                {liveClaim.clearinghouseNotes && (
                  <p className="text-[11px] text-emerald-700 bg-emerald-50 border border-emerald-100 rounded-lg p-2.5 mt-2">
                    {liveClaim.clearinghouseNotes}
                  </p>
                )}
              </div>
            </div>
          )}
        </div>

        {/* ── Field Management Modals (Shared Architecture) ── */}
        {fieldManagerOpen && fieldManagerMode === "select" && (
          <SelectFieldsModal
            initiallySelected={claimSections.flatMap((s) => s.fieldKeys)}
            onlyModules={["claim"]}
            onClose={() => setFieldManagerOpen(false)}
            onApply={(selectedKeys) => {
              setClaimSections((prev) => {
                const updated = [...prev];
                let targetSec = updated[0];
                if (targetSec) {
                  const existing = new Set(targetSec.fieldKeys);
                  selectedKeys.forEach((k) => existing.add(k));
                  targetSec.fieldKeys = Array.from(existing);
                }
                handleSectionsChange(updated);
                return updated;
              });
              setFieldManagerOpen(false);
              toast.success("Fields added to claim overview");
            }}
          />
        )}

        {fieldManagerOpen && fieldManagerMode === "create" && (
          <CreateFieldModal
            lockModule="claim"
            isAdmin={false}
            onClose={() => setFieldManagerOpen(false)}
            onCreated={(newField) => {
              setClaimSections((prev) => {
                const updated = [...prev];
                let targetSec = updated[0];
                if (targetSec) {
                  targetSec.fieldKeys = Array.from(new Set([...(targetSec.fieldKeys || []), newField.key]));
                }
                handleSectionsChange(updated);
                return updated;
              });
              setFieldManagerOpen(false);
              toast.success(`Custom field "${newField.label}" added to claim overview`);
            }}
          />
        )}

        {sectionDrawerOpen && (
          <AdminSectionDrawer
            section={editingSection}
            initialModule="claim"
            onClose={() => {
              setSectionDrawerOpen(false);
              setEditingSection(null);
            }}
            onSaved={(savedSection) => {
              if (editingSection) {
                (updateCustomSection as any)("claim", savedSection.id, savedSection);
                setClaimSections((prev) =>
                  prev.map((s) => (s.id === savedSection.id ? { ...s, title: savedSection.title } : s))
                );
                toast.success("Section updated successfully");
              } else {
                (addCustomSection as any)("claim", savedSection);
                setClaimSections((prev) => [
                  ...prev,
                  {
                    id: savedSection.id,
                    title: savedSection.title,
                    description: savedSection.description,
                    iconName: savedSection.iconName as any,
                    source: "custom",
                    module: "claim",
                    fieldKeys: [],
                  },
                ]);
                toast.success("New section added to claim overview");
              }
              setSectionDrawerOpen(false);
              setEditingSection(null);
            }}
          />
        )}
      </div>
    </div>
  );
}
