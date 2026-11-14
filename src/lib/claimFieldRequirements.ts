/**
 * Required-at-stage for CLAIM fields (Slice 4, item 4.3). A claim field (registry module "claim", custom fields)
 * is required at a stage via its `requiredStages` (stage names; empty = every stage). Optional `workflowIds` on a
 * field scope it to some claim workflows (same idea as processIds on process fields).
 *
 * Values are the claim's typed properties plus its drawer-local field values. Reads the registry through
 * fieldRegistryCore (no React). Manual moves are checked by the Claims page; rule-driven moves are not blocked.
 *
 * TODO(rcm): the claim drawer does not hide fields by workflowIds yet (it renders every claim field); the scoping is
 * honoured here and by the scrubber only.
 */
import { getFieldsForModulePure, type CoreFieldDef } from "./fieldRegistryCore";
import { readLocalRecordFields } from "./recordWriter";
import { isFieldValueEmpty } from "./processFieldValidation";
import type { Claim } from "./claimsStore";

export interface MissingClaimField {
  key: string;
  label: string;
}

function requiredAt(field: CoreFieldDef, stageName: string): boolean {
  if (!field.required) return false;
  const stages: string[] = (field as any).requiredStages || [];
  if (stages.length === 0 || stages.includes("all")) return true;
  const q = stageName.trim().toLowerCase();
  return stages.some((s) => s.trim().toLowerCase() === q);
}

function inWorkflow(field: CoreFieldDef, workflowId?: string): boolean {
  const ids: string[] = (field as any).workflowIds || [];
  return ids.length === 0 || ids.includes("all") || (!!workflowId && ids.includes(workflowId));
}

export function getMissingRequiredClaimFields(claim: Claim, stageName: string, workflowId?: string): MissingClaimField[] {
  if (!stageName) return [];
  const values: Record<string, any> = { ...(claim as any), ...readLocalRecordFields("claim", claim.id) };
  return getFieldsForModulePure("claim")
    .filter((f) => inWorkflow(f, workflowId || claim.processId) && requiredAt(f, stageName))
    .filter((f) => isFieldValueEmpty(values[f.key]))
    .map((f) => ({ key: f.key, label: f.label }));
}
