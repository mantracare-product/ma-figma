import React, { useState, useEffect, useMemo } from "react";
import { ClaimStatus } from "../../../lib/claimsStore";
import { DEFAULT_ENTITY_PROCESSES, getStoredProcesses, PROCESS_STORE_EVENT } from "../../../lib/useProcessStore";
import { SegmentedStageBar } from "../common/SegmentedStageBar";

export interface ClaimStageItem {
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

interface ClaimProgressBarProps {
  status?: ClaimStatus | string;
  currentStageId?: string;
  stages?: ClaimStageItem[];
  onStatusChange?: (newStageId: string, stageName?: string) => void;
  interactive?: boolean;
  claimId?: string;
}

export default function ClaimProgressBar({
  status,
  currentStageId,
  stages: propStages,
  onStatusChange,
  interactive = true,
}: ClaimProgressBarProps) {
  // Fallback internal stages from store if propStages is not provided
  const [internalStages, setInternalStages] = useState<ClaimStageItem[]>(() => {
    const proc = getStoredProcesses().find((p) => p.entityType === "insurance") || DEFAULT_ENTITY_PROCESSES.insurance;
    return proc.stages;
  });

  useEffect(() => {
    if (propStages && propStages.length > 0) return;
    const handleUpdate = () => {
      const proc = getStoredProcesses().find((p) => p.entityType === "insurance") || DEFAULT_ENTITY_PROCESSES.insurance;
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
      currentStageName={currentStageObj?.name || (typeof status === "string" ? status : undefined)}
      currentStageId={currentStageId || currentStageObj?.id}
      onStageSelect={(stg) => {
        if (interactive && onStatusChange) {
          onStatusChange(stg.id, stg.name);
        }
      }}
      interactive={interactive}
    />
  );
}
