import React, { useState, useEffect, useMemo } from "react";
import { InfoTooltip } from "../help/InfoTooltip";
import { getStoredProcesses, Process, PROCESS_STORE_EVENT, isProcessMatchingOrg } from "../../../lib/useProcessStore";
import { useOrganization, Organization } from "../../context/OrganizationContext";

export interface StageOption {
  id: string;
  label: string;
  fullLabel: string;
  category: string;
}

export const stageMapping: Record<string, StageOption[]> = {
  "Patient Intake": [
    { id: "1", label: "Initial Contact", fullLabel: "Patient Intake: Initial Contact", category: "Patient Intake" },
    { id: "2", label: "Insurance Verification", fullLabel: "Patient Intake: Insurance Verification", category: "Patient Intake" },
    { id: "3", label: "Appointment Scheduled", fullLabel: "Patient Intake: Appointment Scheduled", category: "Patient Intake" },
    { id: "4", label: "Completed", fullLabel: "Patient Intake: Completed", category: "Patient Intake" },
  ],
  "Follow-up Calls": [
    { id: "1", label: "Initial Contact", fullLabel: "Follow-up Calls: Initial Contact", category: "Follow-up Calls" },
    { id: "2", label: "Post-Visit Check", fullLabel: "Follow-up Calls: Post-Visit Check", category: "Follow-up Calls" },
    { id: "3", label: "Medication Reminder", fullLabel: "Follow-up Calls: Medication Reminder", category: "Follow-up Calls" },
    { id: "4", label: "Completed", fullLabel: "Follow-up Calls: Completed", category: "Follow-up Calls" },
  ],
  "Billing Support": [
    { id: "1", label: "Initial Contact", fullLabel: "Billing Support: Initial Contact", category: "Billing Support" },
    { id: "2", label: "Billing Inquiry", fullLabel: "Billing Support: Billing Inquiry", category: "Billing Support" },
    { id: "3", label: "Issue Resolution", fullLabel: "Billing Support: Issue Resolution", category: "Billing Support" },
    { id: "4", label: "Payment Reminder", fullLabel: "Billing Support: Payment Reminder", category: "Billing Support" },
  ],
  "Appointment Scheduling": [
    { id: "1", label: "Initial Contact", fullLabel: "Appointment Scheduling: Initial Contact", category: "Appointment Scheduling" },
    { id: "2", label: "Slot Selection", fullLabel: "Appointment Scheduling: Slot Selection", category: "Appointment Scheduling" },
    { id: "3", label: "Confirmation", fullLabel: "Appointment Scheduling: Confirmation", category: "Appointment Scheduling" },
    { id: "4", label: "Completed", fullLabel: "Appointment Scheduling: Completed", category: "Appointment Scheduling" },
  ],
  "Insurance Verification": [
    { id: "1", label: "Initial Contact", fullLabel: "Insurance Verification: Initial Contact", category: "Insurance Verification" },
    { id: "2", label: "Document Check", fullLabel: "Insurance Verification: Document Check", category: "Insurance Verification" },
    { id: "3", label: "Verification", fullLabel: "Insurance Verification: Verification", category: "Insurance Verification" },
    { id: "4", label: "Approval", fullLabel: "Insurance Verification: Approval", category: "Insurance Verification" },
  ],
  "Cataract Surgery Daycare": [
    { id: "cat-0", label: "Pre-Checkin", fullLabel: "Cataract Surgery Daycare: Pre-Checkin", category: "Cataract Surgery Daycare" },
    { id: "cat-1", label: "Checked In", fullLabel: "Cataract Surgery Daycare: Checked In", category: "Cataract Surgery Daycare" },
    { id: "cat-2", label: "Dilation & Drops", fullLabel: "Cataract Surgery Daycare: Dilation & Drops", category: "Cataract Surgery Daycare" },
    { id: "cat-3", label: "Pre-Op Prep", fullLabel: "Cataract Surgery Daycare: Pre-Op Prep", category: "Cataract Surgery Daycare" },
    { id: "cat-4", label: "In Surgery", fullLabel: "Cataract Surgery Daycare: In Surgery", category: "Cataract Surgery Daycare" },
    { id: "cat-5", label: "Recovery & Discharge", fullLabel: "Cataract Surgery Daycare: Recovery & Discharge", category: "Cataract Surgery Daycare" },
  ],
  "Ophthalmology Consultation": [
    { id: "oph-1", label: "Reception & Token", fullLabel: "Ophthalmology Consultation: Reception & Token", category: "Ophthalmology Consultation" },
    { id: "oph-2", label: "Optometry & Vitals", fullLabel: "Ophthalmology Consultation: Optometry & Vitals", category: "Ophthalmology Consultation" },
    { id: "oph-3", label: "Dilation & Waiting", fullLabel: "Ophthalmology Consultation: Dilation & Waiting", category: "Ophthalmology Consultation" },
    { id: "oph-4", label: "Doctor Consultation", fullLabel: "Ophthalmology Consultation: Doctor Consultation", category: "Ophthalmology Consultation" },
    { id: "oph-5", label: "Pharmacy & Billing", fullLabel: "Ophthalmology Consultation: Pharmacy & Billing", category: "Ophthalmology Consultation" },
  ],
  "Inpatient Medical Ward": [
    { id: "ipd-1", label: "Admission & Bed Allocation", fullLabel: "Inpatient Medical Ward: Admission & Bed Allocation", category: "Inpatient Medical Ward" },
    { id: "ipd-2", label: "Diagnostic Workup & Vitals", fullLabel: "Inpatient Medical Ward: Diagnostic Workup & Vitals", category: "Inpatient Medical Ward" },
    { id: "ipd-3", label: "Active Treatment & Rounds", fullLabel: "Inpatient Medical Ward: Active Treatment & Rounds", category: "Inpatient Medical Ward" },
    { id: "ipd-4", label: "Discharge Planning & Summary", fullLabel: "Inpatient Medical Ward: Discharge Planning & Summary", category: "Inpatient Medical Ward" },
  ],
};

export const getStagesForProcess = (processName: string): StageOption[] => {
  if (!processName) return [];
  const cleanName = processName.trim();
  try {
    const stored = getStoredProcesses();
    const found = stored.find(
      (p) => p.name.trim().toLowerCase() === cleanName.toLowerCase() || p.id === cleanName
    );
    if (found && found.stages && found.stages.length > 0) {
      return found.stages.map((s, idx) => ({
        id: s.id || String(idx + 1),
        label: s.name,
        fullLabel: `${found.name}: ${s.name}`,
        category: found.name,
      }));
    }
  } catch {}
  return stageMapping[cleanName] || [];
};

export const getAvailableProcesses = (org?: Organization | null): string[] => {
  try {
    const stored = getStoredProcesses();
    const matching = org ? stored.filter((p) => isProcessMatchingOrg(p, org)) : stored;
    if (matching.length > 0) {
      return matching.map((p) => p.name);
    }
  } catch {}
  return [
    "Patient Intake",
    "Follow-up Calls",
    "Billing Support",
    "Appointment Scheduling",
    "Insurance Verification"
  ];
};

export const availableProcesses = [
  "Patient Intake",
  "Follow-up Calls",
  "Billing Support",
  "Appointment Scheduling",
  "Insurance Verification"
];

export const combinedStages = Object.values(stageMapping).flatMap(stages => stages.map(s => s.fullLabel));

interface ProcessStageSelectProps {
  selectedProcess: string;
  selectedStage: string;
  onProcessChange: (proc: string) => void;
  onStageChange: (stage: string) => void;
  organization?: Organization | null;
  processPlaceholder?: string;
  stagePlaceholder?: string;
  processLabel?: string;
  stageLabel?: string;
  theme?: "standard" | "crm"; // standard = form builder settings style, crm = clients modal style
}

export default function ProcessStageSelect({
  selectedProcess,
  selectedStage,
  onProcessChange,
  onStageChange,
  organization,
  processPlaceholder = "Select a process...",
  stagePlaceholder = "Select a stage...",
  processLabel = "Assign to Process",
  stageLabel = "Initial Stage",
  theme = "standard",
}: ProcessStageSelectProps) {
  const { activeOrganization } = useOrganization();
  const effectiveOrg = organization !== undefined ? organization : activeOrganization;

  const [storedProcesses, setStoredProcesses] = useState<Process[]>(getStoredProcesses);

  useEffect(() => {
    const update = () => {
      setStoredProcesses(getStoredProcesses());
    };
    window.addEventListener(PROCESS_STORE_EVENT, update);
    window.addEventListener("storage", update);
    return () => {
      window.removeEventListener(PROCESS_STORE_EVENT, update);
      window.removeEventListener("storage", update);
    };
  }, []);

  // Filter processes matching scope rules of the current organization
  const scopedProcesses = useMemo(() => {
    const matching = storedProcesses.filter((proc) => {
      if (proc.permissions?.canHide === false) return false;
      return isProcessMatchingOrg(proc, effectiveOrg);
    });
    if (matching.length > 0) {
      return matching;
    }
    // Fallback to all stored processes if none match scope
    return storedProcesses;
  }, [storedProcesses, effectiveOrg]);

  // Derive stages for currently selected process
  const stages: StageOption[] = useMemo(() => {
    if (!selectedProcess) return [];
    const found = storedProcesses.find(
      (p) => p.name.toLowerCase() === selectedProcess.toLowerCase()
    );
    if (found && found.stages && found.stages.length > 0) {
      return found.stages.map((s, idx) => ({
        id: s.id || String(idx + 1),
        label: s.name,
        fullLabel: `${found.name}: ${s.name}`,
        category: found.name,
      }));
    }
    return getStagesForProcess(selectedProcess);
  }, [selectedProcess, storedProcesses]);

  const selectClass = theme === "crm"
    ? "w-full pl-4 pr-10 py-3 bg-white border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-sm font-medium cursor-pointer"
    : "w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary/20 disabled:bg-gray-100 disabled:cursor-not-allowed cursor-pointer";

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      <div>
        <div className="flex items-center gap-1 mb-1.5">
          <label className={theme === "crm" ? "text-sm font-semibold text-foreground" : "text-xs font-medium text-gray-500"} style={{ fontFamily: "Outfit, sans-serif" }}>
            {processLabel}
          </label>
          {theme === "standard" && <InfoTooltip text="New clients from this form start here in your workflow." />}
        </div>
        <select
          value={selectedProcess}
          onChange={(e) => {
            onProcessChange(e.target.value);
            onStageChange(""); // reset stage on process change
          }}
          className={selectClass}
          style={{ fontFamily: "Outfit, sans-serif" }}
        >
          <option value="">{processPlaceholder}</option>
          {scopedProcesses.map((p) => (
            <option key={p.id || p.name} value={p.name}>
              {p.name}
            </option>
          ))}
        </select>
      </div>

      <div>
        <div className="flex items-center gap-1 mb-1.5">
          <label className={theme === "crm" ? "text-sm font-semibold text-foreground" : "text-xs font-medium text-gray-500"} style={{ fontFamily: "Outfit, sans-serif" }}>
            {stageLabel}
          </label>
          {theme === "standard" && <InfoTooltip text="New clients from this form start here in your workflow." />}
        </div>
        <select
          value={selectedStage}
          onChange={(e) => onStageChange(e.target.value)}
          disabled={!selectedProcess}
          className={selectClass}
          style={{ fontFamily: "Outfit, sans-serif" }}
        >
          <option value="">{stagePlaceholder}</option>
          {stages.map((stage) => (
            <option key={stage.id || stage.label} value={stage.label}>
              {stage.label}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
