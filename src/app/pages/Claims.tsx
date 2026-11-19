import { receiveMockEra } from "../../lib/eraStore";
import { useCurrentPermissions } from "@/hooks/useCurrentPermissions";
import ClaimBoard from "../components/claims/ClaimBoard";
import { getMissingRequiredClaimFields } from "../../lib/claimFieldRequirements";
import { claimService } from "../../lib/claimService";
import { getClaimWorkflow, getClaimWorkflows, isPreClaimWorkflow } from "../../lib/claimWorkflows";
import React, { useState, useEffect, useMemo } from "react";
import { useNavigate, useLocation } from "react-router";
import {
  Shield,
  Plus,
  Search,
  Send,
  FileCheck,
  Pencil,
  Eye,
  Settings as SettingsIcon,
  Download,
} from "lucide-react";
import { toast } from "sonner";
import Button from "../components/ui/Button";
import PageHeader from "../components/layout/PageHeader";
import PageTopBar from "../components/layout/PageTopBar";
import { Tooltip } from "../components/ui/Tooltip";
import { DataExportModal } from "../components/common/DataExportModal";
import WorkflowGearDropdown from "../components/workflow/WorkflowGearDropdown";
import { TableComponent, TableColumn, TableRowAction } from "../components/ui/TableComponent";
import {
  Claim,
  ClaimStatus,
  getStoredClaims,
  CLAIMS_CHANGED_EVENT,
  saveClaim,
} from "../../lib/claimsStore";
import { DEFAULT_ENTITY_PROCESSES, getStoredProcesses, PROCESS_STORE_EVENT, Stage } from "../../lib/useProcessStore";
import ClaimSubmissionModal from "../components/claims/ClaimSubmissionModal";
import ClaimStatusModal from "../components/claims/ClaimStatusModal";
import CMS1500Modal from "../components/claims/CMS1500Modal";
import ClaimProgressBar from "../components/claims/ClaimProgressBar";
import ClaimDetailDrawer from "../components/claims/ClaimDetailDrawer";
import CreateClaimModal from "../components/claims/CreateClaimModal";
import { stripSampleSuffix } from "../../lib/sampleSuffixMigration";
import PayersView from "../components/claims/PayersView";
import ClaimDefaultsDrawer from "../components/claims/ClaimDefaultsDrawer";
import ScrubRulesDrawer from "../components/claims/ScrubRulesDrawer";
import { InfoTooltip } from "../components/help/InfoTooltip";
import RequiredFieldsModal from "../components/deals/RequiredFieldsModal";
import { getMissingRequiredProcessFields, MissingRequiredField } from "../../lib/processFieldValidation";
import { useFieldRegistry } from "../context/FieldRegistryContext";

export default function Claims() {
  const navigate = useNavigate();
  const [claims, setClaims] = useState<Claim[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedStatusTab, setSelectedStatusTab] = useState<string>("all");
  const [selectedPayerFilter, setSelectedPayerFilter] = useState<string>("all");
  const [selectedAssigneeFilter, setSelectedAssigneeFilter] = useState<string>("all");
  const [selectedClaimIds, setSelectedClaimIds] = useState<string[]>([]);
  const [storeTick, setStoreTick] = useState(0);

  const { getAllFields } = useFieldRegistry();
  const [requiredFieldsModalState, setRequiredFieldsModalState] = useState<{
    isOpen: boolean;
    claim: Claim | null;
    targetStage: Stage | null;
    missingFields: MissingRequiredField[];
    initialValues: Record<string, any>;
  }>({
    isOpen: false,
    claim: null,
    targetStage: null,
    missingFields: [],
    initialValues: {},
  });

  // Workflow integration: retrieve configured insurance & claims process
  useEffect(() => {
    const handleStoreChange = () => setStoreTick((t) => t + 1);
    window.addEventListener(PROCESS_STORE_EVENT, handleStoreChange);
    window.addEventListener("storage", handleStoreChange);
    return () => {
      window.removeEventListener(PROCESS_STORE_EVENT, handleStoreChange);
      window.removeEventListener("storage", handleStoreChange);
    };
  }, []);

  const location = useLocation();

  const isProcessFixed = useMemo(() => {
    const params = new URLSearchParams(location.search);
    return Boolean(params.get("process") || params.get("processName") || params.get("processId"));
  }, [location.search]);

  // Claim workflows (any number). A claim belongs to one; the selected workflow filters the list.
  const insuranceProcesses = useMemo(() => getClaimWorkflows(), [storeTick]);

  // One workflow at a time (no "All"): the list and the board follow it. Defaults to the workflow with the most claims.
  const [selectedProcessFilter, setSelectedProcessFilter] = useState<string>("");

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const procId = params.get("processId");
    const procName = params.get("process") || params.get("processName");
    if (procId && insuranceProcesses.some((p) => p.id === procId)) {
      workflowPicked.current = true;
      setSelectedProcessFilter(procId);
    } else if (procName) {
      const found = insuranceProcesses.find(
        (p) => p.name.trim().toLowerCase() === procName.trim().toLowerCase()
      );
      if (found) setSelectedProcessFilter(found.id);
    }
  }, [location.search, insuranceProcesses]);

  const workflowCounts = useMemo(() => {
    const first = insuranceProcesses[0]?.id;
    const m: Record<string, number> = {};
    for (const c of claims) { const id = c.processId && insuranceProcesses.some((w) => w.id === c.processId) ? c.processId : first; if (id) m[id] = (m[id] || 0) + 1; }
    return m;
  }, [claims, insuranceProcesses]);
  const workflowPicked = React.useRef(false);
  useEffect(() => {
    if (insuranceProcesses.length === 0) return;
    if (selectedProcessFilter && insuranceProcesses.some((w) => w.id === selectedProcessFilter)) {
      // default = the workflow with the most claims, decided once the claims have loaded (unless picked by the user / URL)
      if (workflowPicked.current || claims.length === 0) return;
      workflowPicked.current = true;
    }
    // default = the workflow with the most records; Eligibility / Prior auth (decided by workflow type) only when no claim workflow has any
    const claimTypes = insuranceProcesses.filter((w) => !isPreClaimWorkflow(w) && (workflowCounts[w.id] || 0) > 0);
    const pool = claimTypes.length > 0 ? claimTypes : insuranceProcesses;
    const best = [...pool].sort((a, b) => (workflowCounts[b.id] || 0) - (workflowCounts[a.id] || 0))[0];
    setSelectedProcessFilter(best.id);
  }, [insuranceProcesses, workflowCounts, selectedProcessFilter]);

  const insuranceProcess = useMemo(() => {
    if (selectedProcessFilter && selectedProcessFilter !== "all") {
      const found = insuranceProcesses.find((p) => p.id === selectedProcessFilter);
      if (found) return found;
    }
    return insuranceProcesses[0] || DEFAULT_ENTITY_PROCESSES.insurance;
  }, [insuranceProcesses, selectedProcessFilter]);

  // Modals state
  const [isCreateMode, setIsCreateMode] = useState(false);
  const [activeSubmissionClaim, setActiveSubmissionClaim] = useState<Claim | null>(null);
  const [activeStatusClaim, setActiveStatusClaim] = useState<Claim | null>(null);
  const [activeCMS1500Claim, setActiveCMS1500Claim] = useState<Claim | null>(null);
  const [showExportModal, setShowExportModal] = useState(false);
  const [selectedClaimForDetail, setSelectedClaimForDetail] = useState<Claim | null>(null);
  const [claimViewMode, setClaimViewMode] = useState<"list" | "board">("list");
  const { hasPermission: hasClaimPermission } = useCurrentPermissions();
  const canPostPayments = hasClaimPermission("rcmPayments", "add");
  const [isDetailDrawerOpen, setIsDetailDrawerOpen] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [isClaimDefaultsOpen, setIsClaimDefaultsOpen] = useState(false);
  const [isScrubRulesOpen, setIsScrubRulesOpen] = useState(false);
  // Claims | Payers toggle (Payers needs the billingSetup permission; deep link: ?view=setup or ?view=payers)
  const canSetup = hasClaimPermission("billingSetup", "read");
  const [view, setView] = useState<"claims" | "payers">(() => {
    const v = new URLSearchParams(window.location.search).get("view");
    return v === "setup" || v === "payers" ? "payers" : "claims";
  });
  const activeView = view === "payers" && canSetup ? "payers" : "claims";

  // Load claims
  const refreshClaims = () => {
    setClaims(getStoredClaims());
  };

  useEffect(() => {
    refreshClaims();
    const handleClaimsChanged = () => refreshClaims();
    window.addEventListener(CLAIMS_CHANGED_EVENT, handleClaimsChanged);
    return () => window.removeEventListener(CLAIMS_CHANGED_EVENT, handleClaimsChanged);
  }, []);

  const handleEditClaim = (claim: Claim) => {
    setSelectedClaimForDetail(claim);
    setIsCreateMode(false);
    setIsDetailDrawerOpen(true);
  };

  const handleStatusChange = (claimId: string, newStatus: ClaimStatus) => {
    const target = claims.find((c) => c.id === claimId);
    if (!target) return;
    const updated: Claim = {
      ...target,
      status: newStatus,
      updatedAt: new Date().toISOString(),
    };
    saveClaim(updated);
    refreshClaims();
  };

  const executeStageChange = (target: Claim, stageId: string, stageName?: string, extraValues?: Record<string, any>) => {
    if (extraValues && Object.keys(extraValues).length > 0) {
      try {
        const storedKey = `mantra_claim_fieldvalues_${target.id}`;
        const raw = localStorage.getItem(storedKey);
        const existing = raw ? JSON.parse(raw) : {};
        localStorage.setItem(storedKey, JSON.stringify({ ...existing, ...extraValues }));
      } catch {}
    }

    const wf = getClaimWorkflow(target.processId) || insuranceProcesses[0] || insuranceProcess;
    const stageObj = wf?.stages?.find((s) => s.id === stageId) || insuranceProcess.stages.find((s) => s.id === stageId);
    const name = stageName || stageObj?.name || stageId;

    try {
      claimService.moveToStage(target.id, stageId, { type: "manual" });
      refreshClaims();
      toast.success(`Claim moved to ${name} ✓`);
    } catch (e: any) {
      toast.error(String(e?.message || e));
    }
  };

  const handleStageChange = (claimId: string, stageId: string, stageName?: string) => {
    const target = claims.find((c) => c.id === claimId);
    if (!target) return;

    // Moving a claim needs claims "edit"; moving a denied claim (denial & appeal work) needs denials "edit".
    const needed = target.denialCategory ? "denials" : "claims";
    if (!hasClaimPermission(needed, "edit")) {
      toast.error(`You don't have permission to move this claim (needs ${needed} edit).`);
      return;
    }

    const wf = getClaimWorkflow(target.processId) || insuranceProcesses[0] || insuranceProcess;
    const stageObj = wf?.stages?.find((s) => s.id === stageId) || insuranceProcess.stages.find((s) => s.id === stageId);
    const name = stageName || stageObj?.name || stageId;

    let storedFields: Record<string, any> = {};
    try {
      const raw = localStorage.getItem(`mantra_claim_fieldvalues_${target.id}`);
      if (raw) storedFields = JSON.parse(raw);
    } catch {}

    const mergedValues = {
      ...storedFields,
      client_name: target.patientName,
      patient_name: target.patientName,
      claim_number: target.claimNumber,
      service_date: target.serviceDate,
      billed_amount: target.totalCharge,
      patient_phone: target.patientPhone,
      patient_dob: target.patientDob,
      policy_number: target.insuredId,
      group_number: target.groupNumber,
      payer_name: target.payer?.name,
    };

    const missing = getMissingRequiredProcessFields({
      module: "claim",
      currentStageName: name,
      allFields: getAllFields("claim"),
      fieldValues: mergedValues,
    });

    if (missing.length > 0) {
      setRequiredFieldsModalState({
        isOpen: true,
        claim: target,
        targetStage: stageObj || ({ id: stageId, name } as Stage),
        missingFields: missing,
        initialValues: mergedValues,
      });
      return;
    }

    executeStageChange(target, stageId, name);
  };

  // Filtered claims
  const filteredClaims = useMemo(() => {
    return claims.filter((claim) => {
      // Workflow: "All" shows every claim; claims without one (not migrated yet) count as the first workflow's.
      if (selectedProcessFilter && (claim.processId && insuranceProcesses.some((w) => w.id === claim.processId) ? claim.processId : insuranceProcesses[0]?.id) !== selectedProcessFilter) return false;
      if (selectedAssigneeFilter === "none" ? !!claim.assignee : selectedAssigneeFilter !== "all" && (claim.assignee || "") !== selectedAssigneeFilter) return false;

      // Payer filter
      if (selectedPayerFilter !== "all" && claim.payer.name !== selectedPayerFilter) return false;

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesNumber = claim.claimNumber.toLowerCase().includes(q);
        const matchesPatient = claim.patientName.toLowerCase().includes(q);
        const matchesPayer = claim.payer.name.toLowerCase().includes(q) || claim.payer.payerId.toLowerCase().includes(q);
        const matchesICD = claim.diagnosisCodes.some(
          (d) => d.code.toLowerCase().includes(q) || d.description.toLowerCase().includes(q)
        );
        const matchesCPT = claim.lines.some(
          (l) => l.cptCode.toLowerCase().includes(q) || l.description.toLowerCase().includes(q)
        );
        if (!matchesNumber && !matchesPatient && !matchesPayer && !matchesICD && !matchesCPT) {
          return false;
        }
      }

      return true;
    });
  }, [claims, selectedProcessFilter, selectedAssigneeFilter, selectedPayerFilter, searchQuery, insuranceProcesses]);

  // Statistics for tab counts
  const stats = useMemo(() => {
    const totalCount = claims.length;
    const paidCount = claims.filter((c) => c.status === "Paid").length;
    const readyCount = claims.filter((c) => c.status === "Ready to Submit").length;
    const submittedCount = claims.filter((c) => ["Submitted", "Under Review", "Accepted"].includes(c.status)).length;
    const draftCount = claims.filter((c) => c.status === "Draft").length;

    return {
      totalCount,
      paidCount,
      readyCount,
      submittedCount,
      draftCount,
    };
  }, [claims]);

  // Unique payers for filter dropdown
  const uniquePayers = useMemo(() => {
    const set = new Set<string>();
    claims.forEach((c) => set.add(c.payer.name));
    return Array.from(set);
  }, [claims]);

  const assignees = useMemo(() => Array.from(new Set(claims.map((c) => c.assignee).filter(Boolean) as string[])).sort(), [claims]);

  const getStatusBadge = (status: ClaimStatus) => {
    switch (status) {
      case "Paid":
        return <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200/80 whitespace-nowrap">Paid</span>;
      case "Accepted":
        return <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-blue-50 text-blue-700 border border-blue-200/80 whitespace-nowrap">Accepted</span>;
      case "Submitted":
        return <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200/80 whitespace-nowrap">Submitted (837P)</span>;
      case "Ready to Submit":
        return <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-50 text-amber-700 border border-amber-200/80 whitespace-nowrap">Ready to Submit</span>;
      case "Under Review":
        return <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-purple-50 text-purple-700 border border-purple-200/80 whitespace-nowrap">Under Review</span>;
      case "Draft":
        return <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-slate-100 text-slate-700 border border-slate-200 whitespace-nowrap">Draft</span>;
      case "Rejected":
        return <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-red-50 text-red-700 border border-red-200 whitespace-nowrap">Rejected</span>;
      default:
        return <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-slate-100 text-slate-700 whitespace-nowrap">{status}</span>;
    }
  };

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(20);

  const totalPages = Math.max(1, Math.ceil(filteredClaims.length / rowsPerPage));
  const startIndex = (currentPage - 1) * rowsPerPage;
  const endIndex = Math.min(startIndex + rowsPerPage, filteredClaims.length);
  const paginatedClaims = filteredClaims.slice(startIndex, endIndex);

  return (
    <div className="min-h-screen bg-[#fafafa]">
      <div className="px-10 sm:px-12 py-7.5 sm:py-8 w-full space-y-7">
        {/* Top Header */}
        <PageHeader
          title={isProcessFixed && insuranceProcess.name ? insuranceProcess.name : "Insurance & Claims"}
          subtitle={isProcessFixed && insuranceProcess.name ? `Manage ${insuranceProcess.name} lifecycle` : "End-to-end RCM: Auto-link appointments, CPT codes, and AI Scribe ICD-10 notes into electronic 837P claims and CMS-1500 forms."}
        />

        {activeView === "payers" ? (
          <PayersView
            modes={canSetup ? [{ id: "claims", label: "Claims" }, { id: "payers", label: "Payers" }] : undefined}
            activeMode="payers"
            onModeChange={(m) => setView(m === "payers" ? "payers" : "claims")}
          />
        ) : (
          <>
            {/* Filter and Search Bar powered by PageTopBar */}
            <PageTopBar
              isBottomPanelAttached={true}
              leftElement={(
                <select aria-label="Workflow" data-testid="claims-filter-workflow" value={selectedProcessFilter} onChange={(e) => { workflowPicked.current = true; setSelectedProcessFilter(e.target.value); setCurrentPage(1); }} className="h-[36px] text-xs px-3 bg-white border border-border rounded-xl font-semibold text-gray-700 outline-none cursor-pointer shadow-2xs" style={{ fontFamily: "Outfit, sans-serif" }}>
                  {insuranceProcesses.map((proc) => <option key={proc.id} value={proc.id}>{stripSampleSuffix(proc.name)} ({workflowCounts[proc.id] || 0})</option>)}
                </select>
              )}
              modes={canSetup ? [{ id: "claims", label: "Claims" }, { id: "payers", label: "Payers" }] : undefined}
              activeMode="claims"
              onModeChange={(m) => setView(m === "payers" ? "payers" : "claims")}
              showSearch={true}
              searchQuery={searchQuery}
              onSearchChange={(v) => {
                setSearchQuery(v);
                setCurrentPage(1);
              }}
              searchPlaceholder="Search by Claim #, Patient Name, Insurance Payer, ICD-10 or CPT code..."
              secondaryActions={(
                <div className="flex items-center gap-2 flex-wrap" data-testid="claims-filters">
                  <select aria-label="Payer" data-testid="claims-filter-payer" value={selectedPayerFilter} onChange={(e) => { setSelectedPayerFilter(e.target.value); setCurrentPage(1); }} className="h-[36px] text-xs px-3 bg-white border border-border rounded-xl font-semibold text-gray-700 outline-none cursor-pointer shadow-2xs" style={{ fontFamily: "Outfit, sans-serif" }}>
                    <option value="all">All payers</option>
                    {uniquePayers.map((p) => <option key={p} value={p}>{p}</option>)}
                  </select>
                  <select aria-label="Assignee" data-testid="claims-filter-assignee" value={selectedAssigneeFilter} onChange={(e) => { setSelectedAssigneeFilter(e.target.value); setCurrentPage(1); }} className="h-[36px] text-xs px-3 bg-white border border-border rounded-xl font-semibold text-gray-700 outline-none cursor-pointer shadow-2xs" style={{ fontFamily: "Outfit, sans-serif" }}>
                    <option value="all">All assignees</option>
                    <option value="none">Unassigned</option>
                    {assignees.map((a) => <option key={a} value={a}>{a}</option>)}
                  </select>
                  <div className="flex items-center rounded-xl border border-border overflow-hidden shadow-2xs">
                    <button type="button" data-testid="claims-view-list" onClick={() => setClaimViewMode("list")} className={"h-[36px] px-3 text-xs font-semibold " + (claimViewMode === "list" ? "bg-slate-900 text-white" : "bg-white text-gray-700")}>List</button>
                    <button type="button" data-testid="claims-view-board" onClick={() => setClaimViewMode("board")} className={"h-[36px] px-3 text-xs font-semibold " + (claimViewMode === "board" ? "bg-slate-900 text-white" : "bg-white text-gray-700")}>Board</button>
                  </div>
                </div>
              )}
              primaryAction={!hasClaimPermission("claims", "add") ? undefined : {
                label: "Create Claim",
                icon: <Plus className="w-4 h-4" />,
                onClick: () => setShowCreateModal(true),
              }}
              afterPrimaryAction={(
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    data-testid="claims-receive-era"
                    disabled={!canPostPayments}
                    title={canPostPayments ? "Stage a remittance (ERA) for claims that are out with the payer" : "You need the rcmPayments permission"}
                    onClick={() => {
                      const era = receiveMockEra({ includeUnmatched: true });
                      toast.success(`ERA ${era.traceNumber} received (${era.lines.length} lines)`);
                    }}
                    className="px-3 h-[36px] text-xs font-semibold rounded-lg border border-border bg-white hover:bg-slate-50 disabled:opacity-50 shadow-2xs"
                  >
                    Receive ERA
                  </button>
                  <Tooltip text="Export Claims">
                    <button
                      type="button"
                      disabled={!hasClaimPermission("claims", "export")}
                      onClick={() => setShowExportModal(true)}
                      className="p-2 h-[36px] w-[36px] flex items-center justify-center rounded-lg text-gray-500 hover:text-gray-900 hover:bg-gray-100 border border-border bg-white transition-colors shrink-0 cursor-pointer shadow-2xs"
                      aria-label="Export Claims"
                      title="Export Claims"
                    >
                      <Download className="w-4 h-4 text-slate-600" />
                    </button>
                  </Tooltip>
                  <WorkflowGearDropdown
                    entityType="claim"
                    processId={insuranceProcess.id}
                    processName={insuranceProcess.name}
                    buttonClassName="p-2 h-[36px] w-[36px] flex items-center justify-center rounded-lg text-gray-500 hover:text-gray-900 hover:bg-gray-100 border border-border bg-white transition-colors shrink-0 cursor-pointer shadow-2xs"
                    onOpenClaimDefaults={canSetup ? () => setIsClaimDefaultsOpen(true) : undefined}
                    onOpenScrubRules={canSetup ? () => setIsScrubRulesOpen(true) : undefined}
                  />
                </div>
              )}
            />

            <CreateClaimModal
              isOpen={showCreateModal && hasClaimPermission("claims", "add")}
              onClose={() => setShowCreateModal(false)}
              onCreated={(claim) => {
                refreshClaims();
                setSelectedClaimForDetail(claim);
                setIsCreateMode(false);
                setIsDetailDrawerOpen(true);
              }}
            />

            {/* Unified DataExportModal */}
            <DataExportModal
              isOpen={showExportModal}
              onClose={() => setShowExportModal(false)}
              title="Export Claims"
              subtitle="Export 837P and CMS-1500 insurance claims with payer, diagnosis, and billing details"
              data={claims}
              filenamePrefix="insurance_claims"
              dateFieldKey="serviceDate"
              dateLabel="Service Date"
              statusFieldKey="status"
              statusLabel="Claim Status"
              statusOptions={[
                { label: "Ready to Submit", value: "ready" },
                { label: "Submitted", value: "submitted" },
                { label: "Paid", value: "paid" },
                { label: "Draft", value: "draft" },
              ]}
              allFields={[
                { key: "claimNumber", label: "Claim #", getValue: (c) => c.claimNumber },
                { key: "patientName", label: "Client / Patient", getValue: (c) => c.patientName },
                { key: "insurancePayer", label: "Insurance Payer", getValue: (c) => c.payer?.name || "" },
                { key: "policyNumber", label: "Policy #", getValue: (c) => c.insuredId || "" },
                { key: "serviceDate", label: "Service Date", getValue: (c) => c.serviceDate },
                { key: "totalAmount", label: "Total Billed", getValue: (c) => `$${(c.totalCharge || 0).toFixed(2)}` },
                { key: "status", label: "Status", getValue: (c) => c.status },
                { key: "cptCodes", label: "CPT Codes", getValue: (c) => (c.lines || []).map((x) => x.cptCode).join("; ") },
                { key: "icd10Codes", label: "ICD-10 Diagnoses", getValue: (c) => (c.diagnosisCodes || []).map((x) => x.code).join("; ") },
              ]}
            />

            {/* Claims Table View Connected with TableComponent */}
            {(() => {
          const claimColumns: TableColumn<Claim>[] = [
            {
              id: "claimNumber",
              header: "Claim ID",
              align: "left",
              render: (claim) => (
                <button
                  type="button"
                  onClick={() => {
                    setSelectedClaimForDetail(claim);
                    setIsDetailDrawerOpen(true);
                  }}
                  className="font-mono font-bold text-[#1456f0] hover:underline text-xs cursor-pointer text-left transition-colors"
                  title="Click to view claim details, custom fields & activity"
                >
                  {claim.claimNumber}
                </button>
              ),
            },
            {
              id: "title",
              header: "Title",
              align: "left",
              render: (claim) => {
                const clientName = claim.patientName || "Client";
                const dateStr = claim.serviceDate || (claim.createdAt ? claim.createdAt.slice(0, 10) : "2026-10-15");
                const titleStr = `${clientName}_Claim_${dateStr}`;
                return (
                  <span
                    className="font-medium text-xs text-slate-800 truncate max-w-[220px] inline-block"
                    style={{ fontFamily: "Outfit, sans-serif" }}
                    title={titleStr}
                  >
                    {titleStr}
                  </span>
                );
              },
            },
            {
              id: "stage",
              header: "Stages",
              align: "center",
              render: (claim) => {
                const stages = insuranceProcess.stages;
                const stageKey = (claim.currentStageId || "").trim();
                const matchedStage = stageKey
                  ? stages.find(
                      (s) =>
                        s.id.toLowerCase() === stageKey.toLowerCase() ||
                        s.name.toLowerCase() === stageKey.toLowerCase() ||
                        (claim.statusLabel && s.name.toLowerCase() === claim.statusLabel.toLowerCase())
                    )
                  : (stages.find((s) => s.systemCategory === claim.status || s.name.toLowerCase() === (claim.status || "").toLowerCase()) || stages[0]);

                return (
                  <div className="flex items-center justify-center">
                    <ClaimProgressBar
                      status={claim.status}
                      currentStageId={claim.currentStageId || matchedStage?.id}
                      stages={insuranceProcess.stages}
                      onStatusChange={(stageId, stageName) => handleStageChange(claim.id, stageId, stageName)}
                      interactive={true}
                      claimId={claim.id}
                    />
                  </div>
                );
              },
            },
            {
              id: "patientName",
              header: "Client",
              align: "left",
              render: (claim) => (
                <button
                  type="button"
                  onClick={() => handleEditClaim(claim)}
                  className="font-semibold text-[#1456f0] hover:underline text-xs cursor-pointer text-left"
                  style={{ fontFamily: "Outfit, sans-serif" }}
                >
                  {claim.patientName}
                </button>
              ),
            },
            {
              id: "payer",
              header: "Insurance Payer",
              align: "left",
              render: (claim) => (
                <span className="font-medium text-slate-700 text-xs truncate max-w-[180px] inline-block" title={claim.payer.name} style={{ fontFamily: "Outfit, sans-serif" }}>
                  {claim.payer.name}
                </span>
              ),
            },
            {
              id: "serviceDate",
              header: "Service Date",
              align: "left",
              render: (claim) => (
                <span className="text-slate-600 font-medium text-xs font-mono">
                  {claim.serviceDate}
                </span>
              ),
            },
            {
              id: "totalCharge",
              header: "Billed Amount",
              align: "right",
              render: (claim) => (
                <span className="font-mono font-bold text-slate-900 text-xs">
                  ${claim.totalCharge.toFixed(2)}
                </span>
              ),
            },
          ];

          const claimRowActions: TableRowAction<Claim>[] = [
            {
              label: "Edit Claim",
              icon: <Pencil className="w-3.5 h-3.5" />,
              onClick: (claim) => handleEditClaim(claim),
            },
            {
              label: "Submit / View Status",
              icon: <Send className="w-3.5 h-3.5" />,
              onClick: (claim) => {
                if (["Ready to Submit", "Draft"].includes(claim.status)) {
                  setActiveSubmissionClaim(claim);
                } else {
                  setActiveStatusClaim(claim);
                }
              },
            },
            {
              label: "View CMS-1500 Form",
              icon: <Eye className="w-3.5 h-3.5" />,
              onClick: (claim) => setActiveCMS1500Claim(claim),
            },
          ];

          return (
            <>
            {claimViewMode === "board" ? (
              <ClaimBoard
                stages={insuranceProcess.stages}
                claims={filteredClaims}
                onMove={(id, stageId) => handleStageChange(id, stageId)}
                onOpen={(c) => { setSelectedClaimForDetail(c); setIsDetailDrawerOpen(true); }}
              />
            ) : (
              <TableComponent
                data={filteredClaims}
                columns={claimColumns}
                getRowId={(claim) => claim.id}
                rowActions={claimRowActions}
                selectedIds={new Set(selectedClaimIds)}
                onSelectionChange={(ids) => setSelectedClaimIds(Array.from(ids) as string[])}
                defaultRowsPerPage={20}
                emptyMessage="No insurance claims found matching your filters."
              />
            )}
            </>
          );
        })()}
        </>
        )}

        {/* Claim Submission Modal (Electronic 837P or Manual CMS-1500) */}
        <ClaimSubmissionModal
          claim={activeSubmissionClaim}
          isOpen={!!activeSubmissionClaim}
          onClose={() => setActiveSubmissionClaim(null)}
          onOpenCMS1500={(c) => setActiveCMS1500Claim(c)}
          onSubmissionSuccess={() => refreshClaims()}
        />

        {/* Clearinghouse Transmission Status Modal */}
        <ClaimStatusModal
          claim={activeStatusClaim}
          isOpen={!!activeStatusClaim}
          onClose={() => setActiveStatusClaim(null)}
          onOpenCMS1500={(c) => setActiveCMS1500Claim(c)}
        />

        {/* CMS-1500 Form Modal */}
        <CMS1500Modal
          claim={activeCMS1500Claim}
          isOpen={!!activeCMS1500Claim}
          onClose={() => setActiveCMS1500Claim(null)}
        />

        {/* Claim Defaults Drawer */}
        <ClaimDefaultsDrawer
          isOpen={isClaimDefaultsOpen}
          onClose={() => setIsClaimDefaultsOpen(false)}
        />

        {/* Scrub Rules Drawer */}
        <ScrubRulesDrawer
          isOpen={isScrubRulesOpen}
          onClose={() => setIsScrubRulesOpen(false)}
        />

        {/* Claim Detail Drawer (Standard Architecture: Draggable Sections + Activity Feed + Documents) */}
        <ClaimDetailDrawer
          isOpen={isDetailDrawerOpen}
          isCreateMode={isCreateMode}
          onClose={() => {
            setIsDetailDrawerOpen(false);
            setIsCreateMode(false);
            setSelectedClaimForDetail(null);
          }}
          claim={selectedClaimForDetail}
          onClaimCreated={() => {
            refreshClaims();
          }}
          onEditClaim={(c) => {
            setSelectedClaimForDetail(c);
            setIsCreateMode(false);
            setIsDetailDrawerOpen(true);
          }}
          onOpenCMS1500={(c) => setActiveCMS1500Claim(c)}
        />

        {/* Required Fields Modal when stage changes */}
        <RequiredFieldsModal
          isOpen={requiredFieldsModalState.isOpen}
          onClose={() => setRequiredFieldsModalState((p) => ({ ...p, isOpen: false }))}
          clientName={requiredFieldsModalState.claim?.patientName || "Claim"}
          clientId={requiredFieldsModalState.claim?.patientId || ""}
          processName="Insurance Process"
          targetStageName={requiredFieldsModalState.targetStage?.name || ""}
          missingFields={requiredFieldsModalState.missingFields}
          allFields={getAllFields("claim")}
          initialValues={requiredFieldsModalState.initialValues}
          onConfirm={(filledValues) => {
            if (requiredFieldsModalState.claim && requiredFieldsModalState.targetStage) {
              executeStageChange(
                requiredFieldsModalState.claim,
                requiredFieldsModalState.targetStage.id,
                requiredFieldsModalState.targetStage.name,
                filledValues
              );
            }
            setRequiredFieldsModalState((p) => ({ ...p, isOpen: false }));
          }}
        />
      </div>
    </div>
  );
}
