import React, { useState } from "react";
import { InfoTooltip } from "../help/InfoTooltip";

export const availableProcesses = [
  "Patient Intake",
  "Follow-up Calls",
  "Billing Support",
  "Appointment Scheduling",
  "Insurance Verification"
];

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
  ]
};

export const getStagesForProcess = (processName: string): StageOption[] => {
  return stageMapping[processName] || stageMapping["Patient Intake"];
};

export const combinedStages = Object.values(stageMapping).flatMap(stages => stages.map(s => s.fullLabel));

interface ProcessStageSelectProps {
  selectedProcess: string;
  selectedStage: string;
  onProcessChange: (proc: string) => void;
  onStageChange: (stage: string) => void;
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
  processPlaceholder = "Select a process...",
  stagePlaceholder = "Select a stage...",
  processLabel = "Assign to Process",
  stageLabel = "Initial Stage",
  theme = "standard",
}: ProcessStageSelectProps) {
  const stages = selectedProcess ? getStagesForProcess(selectedProcess) : [];

  const selectClass = theme === "crm"
    ? "w-full pl-4 pr-10 py-3 bg-white border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-sm font-medium"
    : "w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary/20 disabled:bg-gray-100 disabled:cursor-not-allowed";

  const labelClass = theme === "crm"
    ? "block text-sm font-semibold mb-1.5 text-foreground"
    : "block text-xs font-medium mb-1.5 text-gray-500";

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
          {availableProcesses.map((p) => (
            <option key={p} value={p}>
              {p}
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
            <option key={stage.label} value={stage.label}>
              {stage.label}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
