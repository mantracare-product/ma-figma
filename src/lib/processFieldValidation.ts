/**
 * processFieldValidation.ts
 * Path: src/lib/processFieldValidation.ts
 *
 * Validates stage-specific required fields and sections for a client in a given process stage.
 */

import type { FieldDefinition, SectionDefinition } from "../app/context/FieldRegistryContext";
import { isProcessMatchingAssignment } from "../app/context/FieldRegistryContext";

export interface MissingRequiredField {
  key: string;
  label: string;
  sectionTitle?: string;
  sectionId?: string;
}

/**
 * Determines whether a given value is considered empty for validation purposes.
 */
export function isFieldValueEmpty(val: any): boolean {
  if (val === undefined || val === null) return true;
  if (typeof val === "string") {
    const trimmed = val.trim();
    return trimmed === "" || trimmed === "—" || trimmed === "-";
  }
  if (Array.isArray(val)) {
    return val.length === 0;
  }
  if (typeof val === "object") {
    return Object.keys(val).length === 0;
  }
  return false;
}

/**
 * Checks whether a field requirement matches the given stage name.
 */
export function isFieldRequiredForStage(
  field: FieldDefinition,
  stageName: string
): boolean {
  if (!field.required) return false;
  if (!field.requiredStages || field.requiredStages.length === 0) {
    // If no specific stages configured, it applies to all stages
    return true;
  }
  if (field.requiredStages.includes("all")) return true;
  if (!stageName) return true;
  const targetLower = stageName.trim().toLowerCase();
  return field.requiredStages.some(
    (st) => st.trim().toLowerCase() === targetLower || st.trim().toLowerCase() === "all"
  );
}

/**
 * Checks whether a section requirement matches the given stage name.
 */
export function isSectionRequiredForStage(
  section: SectionDefinition,
  stageName: string
): boolean {
  if (!section.required) return false;
  if (!section.requiredStages || section.requiredStages.length === 0) {
    return true;
  }
  if (section.requiredStages.includes("all")) return true;
  if (!stageName) return true;
  const targetLower = stageName.trim().toLowerCase();
  return section.requiredStages.some(
    (st) => st.trim().toLowerCase() === targetLower || st.trim().toLowerCase() === "all"
  );
}

/**
 * Computes all missing required fields for a client in a specific process and stage.
 */
export function getMissingRequiredProcessFields({
  processId,
  processName,
  currentStageName,
  allFields,
  allSections = [],
  fieldValues = {},
}: {
  processId?: string;
  processName?: string;
  currentStageName: string;
  allFields: FieldDefinition[];
  allSections?: SectionDefinition[];
  fieldValues?: Record<string, any>;
}): MissingRequiredField[] {
  if (!currentStageName) return [];

  // Filter fields applicable to this process (or global process fields)
  const processFields = allFields.filter((f) => {
    if (f.module !== "process") return false;
    if (!f.processIds || f.processIds.length === 0 || f.processIds.includes("all")) return true;
    if (processId && isProcessMatchingAssignment(f.processIds, processId)) return true;
    if (processName && isProcessMatchingAssignment(f.processIds, processName)) return true;
    return false;
  });

  const missingFieldsMap = new Map<string, MissingRequiredField>();

  // 1. Check direct field requirements
  for (const f of processFields) {
    if (isFieldRequiredForStage(f, currentStageName)) {
      const val = fieldValues[f.key];
      if (isFieldValueEmpty(val)) {
        missingFieldsMap.set(f.key, {
          key: f.key,
          label: f.label,
          sectionId: f.sectionId,
        });
      }
    }
  }

  // 2. Check section requirements (all fields inside a required section must be filled)
  const applicableSections = allSections.filter((s) => {
    if (s.module !== "process") return false;
    if (!s.processIds || s.processIds.length === 0 || s.processIds.includes("all")) return true;
    if (processId && isProcessMatchingAssignment(s.processIds, processId)) return true;
    if (processName && isProcessMatchingAssignment(s.processIds, processName)) return true;
    return false;
  });

  for (const sec of applicableSections) {
    if (isSectionRequiredForStage(sec, currentStageName)) {
      const keys = sec.fieldKeys || [];
      for (const k of keys) {
        const fieldDef = processFields.find((f) => f.key === k);
        const val = fieldValues[k];
        if (isFieldValueEmpty(val)) {
          missingFieldsMap.set(k, {
            key: k,
            label: fieldDef?.label || k,
            sectionTitle: sec.title,
            sectionId: sec.id,
          });
        }
      }
    }
  }

  return Array.from(missingFieldsMap.values());
}
