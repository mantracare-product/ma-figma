import React, { useState, useEffect, useMemo } from "react";
import { InvoiceStatus } from "../../types/invoiceTypes";
import { DEFAULT_ENTITY_PROCESSES, getStoredProcesses, PROCESS_STORE_EVENT } from "../../../lib/useProcessStore";
import { SegmentedStageBar } from "../common/SegmentedStageBar";

export interface InvoiceStageItem {
  id: string;
  name: string;
  color?: string;
  systemCategory?: string;
  isInitial?: boolean;
  isFinal?: boolean;
  isFinalStage?: boolean;
  stagePosition?: "initial" | "intermediate" | "final" | null;
  stageCategory?: "in_progress" | "success" | "lost";
}

interface InvoiceProgressBarProps {
  status: InvoiceStatus;
  currentStageId?: string;
  stages?: InvoiceStageItem[];
  onStatusChange?: (newStatusOrStageId: InvoiceStatus | string) => void;
  interactive?: boolean;
  logId?: string;
  size?: "sm" | "md" | "lg";
}

export default function InvoiceProgressBar({
  status,
  currentStageId,
  stages: propStages,
  onStatusChange,
  interactive = true,
}: InvoiceProgressBarProps) {
  // Fallback internal stages from store if propStages is not provided
  const [internalStages, setInternalStages] = useState<InvoiceStageItem[]>(() => {
    const proc = getStoredProcesses().find((p) => p.entityType === "invoice") || DEFAULT_ENTITY_PROCESSES.invoice;
    return proc.stages;
  });

  useEffect(() => {
    if (propStages) return;
    const handleUpdate = () => {
      const proc = getStoredProcesses().find((p) => p.entityType === "invoice") || DEFAULT_ENTITY_PROCESSES.invoice;
      setInternalStages(proc.stages);
    };
    window.addEventListener(PROCESS_STORE_EVENT, handleUpdate);
    window.addEventListener("storage", handleUpdate);
    return () => {
      window.removeEventListener(PROCESS_STORE_EVENT, handleUpdate);
      window.removeEventListener("storage", handleUpdate);
    };
  }, [propStages]);

  const effectiveStages = useMemo(() => {
    if (propStages && propStages.length > 0) return propStages;
    return internalStages;
  }, [propStages, internalStages]);

  const currentStageObj = useMemo(() => {
    if (currentStageId && currentStageId.trim() !== "") {
      const match = effectiveStages.find(
        (s) =>
          s.id.toLowerCase() === currentStageId.trim().toLowerCase() ||
          s.name.toLowerCase() === currentStageId.trim().toLowerCase()
      );
      if (match) return match;
    }
    if (status && typeof status === "string") {
      const clean = status.trim().toLowerCase();
      const match = effectiveStages.find(
        (s) =>
          s.name.toLowerCase() === clean ||
          s.id.toLowerCase() === clean ||
          (s.systemCategory && s.systemCategory.toLowerCase() === clean)
      );
      if (match) return match;
    }
    return effectiveStages[0];
  }, [effectiveStages, currentStageId, status]);

  return (
    <SegmentedStageBar
      stages={effectiveStages}
      currentStageName={currentStageObj?.name || status}
      currentStageId={currentStageId || currentStageObj?.id}
      onStageSelect={(stg) => {
        if (interactive && onStatusChange) {
          onStatusChange(stg.id);
        }
      }}
      interactive={interactive}
    />
  );
}
