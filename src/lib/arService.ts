import { recordRcmAudit } from "./rcmAudit";
import { getStoredArRecords, saveArRecord, type ArRecord, getArWorkflow, getArWorkflows } from "./arStore";
import type { Claim } from "./claimsStore";
import { logStageMove, type StageMove } from "./useAutomationStore";
import { eventBus } from "./eventBus";
import type { Stage } from "./useProcessStore";

export type MoveCause = StageMove["cause"];

export interface ArMoveResult {
  record: ArRecord;
  moved: boolean;
  fromStageId?: string;
  toStageId: string;
  stageName: string;
}

function findStageInWorkflow(workflow: any, stageRef: string): Stage | undefined {
  if (!workflow || !Array.isArray(workflow.stages)) return undefined;
  const refLower = stageRef.trim().toLowerCase();
  return (
    workflow.stages.find((s: Stage) => s.id === stageRef) ||
    workflow.stages.find((s: Stage) => s.name.trim().toLowerCase() === refLower) ||
    workflow.stages.find((s: Stage) => (s.systemCategory || "").toLowerCase() === refLower)
  );
}

function emitArDomainEvent(record: ArRecord, eventName: string, cause?: MoveCause): void {
  void eventBus.emit(eventName, "ar", record.id, {
    ...record,
    arId: record.id,
    claimId: record.claimId,
    clientId: record.patientId,
    chain: cause?.chain,
  });
}

export const arService = {
  createArFromClaim(claim: Claim, initialStageRef?: string, cause?: MoveCause): ArRecord {
    const existing = getStoredArRecords().find((r) => r.claimId === claim.id);
    if (existing) {
      return existing;
    }

    const workflow = getArWorkflow();
    if (!workflow) {
      throw new Error("No AR workflow configured");
    }

    const initialStage = initialStageRef
      ? findStageInWorkflow(workflow, initialStageRef) || workflow.stages[0]
      : workflow.stages[0];

    const billed = claim.totalCharge || 0;
    const paid = claim.amountPaid || 0;
    const adjustments = claim.contractualAdjustment || 0;
    const pr = claim.patientResponsibility || 0;
    const outstanding = Math.max(0, billed - paid - adjustments);
    const serviceDate = claim.serviceDate || new Date().toISOString().slice(0, 10);
    const subDate = claim.submittedAt || claim.createdAt || serviceDate;
    const ageDays = Math.max(0, Math.floor((Date.now() - new Date(subDate).getTime()) / 86400000));

    const newRecord: ArRecord = {
      id: `ar-${claim.claimNumber || claim.id}`,
      claimId: claim.id,
      claimNumber: claim.claimNumber || `CLM-${claim.id}`,
      patientId: claim.patientId || "",
      patientName: claim.patientName || "Unknown Patient",
      payerId: claim.payer?.id || claim.payer?.payerId || "payer-default",
      payerName: claim.payer?.name || "Insurance Payer",
      providerName: claim.renderingProviderName || claim.billingProviderName || "Rendering Provider",
      dateOfService: serviceDate,
      submittedDate: subDate,
      ageInDays: ageDays,
      billedAmount: billed,
      allowedAmount: paid + adjustments + pr,
      paidAmount: paid,
      adjustmentAmount: adjustments,
      patientResponsibility: pr,
      outstandingAmount: outstanding,
      denialCategory: claim.denialCategory,
      carcCodes: claim.denialCodes,
      appealDeadline: claim.appealDeadline,
      processId: workflow.id,
      currentStageId: initialStage.id,
      statusLabel: initialStage.name,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      history: [
        {
          date: new Date().toISOString(),
          type: "created",
          description: `AR record created from claim ${claim.claimNumber} in stage ${initialStage.name}`,
        },
      ],
    };

    saveArRecord(newRecord);

    logStageMove(
      {
        orgId: "default",
        recordType: "ar",
        recordId: newRecord.id,
        processId: workflow.id,
        toStageId: initialStage.id,
        toStageName: initialStage.name,
        cause: cause || { type: "rule", ruleName: "Claim accepted to AR" },
      },
      { recordData: newRecord }
    );

    emitArDomainEvent(newRecord, "ar.created", cause);
    recordRcmAudit({
      action: "created",
      entityType: "claim",
      entityId: newRecord.id,
      actor: cause?.ruleName || "arService",
      summary: `AR record created from claim ${claim.claimNumber} (${initialStage.name})`,
    });

    return newRecord;
  },

  moveToStage(arId: string, stageRef: string, cause?: MoveCause): ArMoveResult | null {
    const record = getStoredArRecords().find((r) => r.id === arId);
    if (!record) return null;

    const workflow = getArWorkflow(record.processId);
    if (!workflow) throw new Error(`Workflow ${record.processId} not found`);

    const targetStage = findStageInWorkflow(workflow, stageRef);
    if (!targetStage) throw new Error(`Stage ${stageRef} not found in workflow ${workflow.name}`);

    if (record.currentStageId === targetStage.id) {
      return {
        record,
        moved: false,
        fromStageId: record.currentStageId,
        toStageId: targetStage.id,
        stageName: targetStage.name,
      };
    }

    const fromStageId = record.currentStageId;
    const fromStage = findStageInWorkflow(workflow, fromStageId);

    const updated: ArRecord = {
      ...record,
      currentStageId: targetStage.id,
      statusLabel: targetStage.name,
      updatedAt: new Date().toISOString(),
      history: [
        ...(record.history || []),
        {
          date: new Date().toISOString(),
          type: "stage_change",
          description: `Moved from ${fromStage?.name || fromStageId} to ${targetStage.name}`,
        },
      ],
    };

    saveArRecord(updated);

    logStageMove(
      {
        orgId: "default",
        recordType: "ar",
        recordId: updated.id,
        processId: workflow.id,
        fromStageId,
        fromStageName: fromStage?.name,
        toStageId: targetStage.id,
        toStageName: targetStage.name,
        cause: cause || { type: "manual" },
      },
      { recordData: updated }
    );

    // Domain event dispatch based on systemCategory
    const cat = (targetStage.systemCategory || "").toLowerCase();
    if (cat === "denied") {
      emitArDomainEvent(updated, "ar.denied", cause);
    } else if (cat === "paid") {
      emitArDomainEvent(updated, "ar.paid", cause);
    } else if (cat === "partially_paid") {
      emitArDomainEvent(updated, "ar.partially_paid", cause);
    } else if (cat === "won" || cat === "lost") {
      emitArDomainEvent(updated, "ar.closed", cause);
    }

    recordRcmAudit({
      action: "updated",
      entityType: "claim",
      entityId: updated.id,
      actor: cause?.ruleName || (cause?.type === "manual" ? undefined : "arService"),
      before: { stage: fromStage?.name },
      after: { stage: targetStage.name },
      summary: `AR record ${updated.claimNumber} moved to ${targetStage.name}`,
    });

    return {
      record: updated,
      moved: true,
      fromStageId,
      toStageId: targetStage.id,
      stageName: targetStage.name,
    };
  },

  updateArRecord(arId: string, patch: Partial<ArRecord>): ArRecord | null {
    const record = getStoredArRecords().find((r) => r.id === arId);
    if (!record) return null;
    const updated = {
      ...record,
      ...patch,
      updatedAt: new Date().toISOString(),
    };
    saveArRecord(updated);
    return updated;
  },
};
