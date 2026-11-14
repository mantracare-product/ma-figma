/**
 * fieldRegistryCore (Slice 2, item 2.2): READ-ONLY, non-React reader for the custom field/section registry.
 *
 * The React context owns writes. Actions, the scrubber and reports need to read field definitions without a
 * hook, so this module reads the same localStorage keys and never writes back. System seeds are NOT read here
 * (they live in a .tsx module); RCM field groups are seeded into the stored registry (ensureRcmFieldSeeds, S3.1)
 * so they are visible to this reader.
 */
export const FIELD_REGISTRY_KEY = "mantra_field_registry_v1";
export const SECTION_REGISTRY_KEY = "mantra_section_registry_v1";

export interface CoreFieldDef {
  id: number;
  key: string;
  label: string;
  module: string;
  inputType: string;
  source?: string;
  required?: boolean;
  processIds?: string[];
  isReusable?: boolean;
  reusableModules?: string[];
  sectionId?: string;
  subFields?: Array<{ key: string; label: string; inputType?: string }>;
  [k: string]: any;
}

export interface CoreSectionDef {
  id: string;
  label?: string;
  name?: string;
  module: string;
  processIds?: string[];
  isReusable?: boolean;
  reusableModules?: string[];
  [k: string]: any;
}

function readArray<T>(key: string): T[] {
  try {
    const raw = typeof localStorage !== "undefined" ? localStorage.getItem(key) : null;
    const v = raw ? JSON.parse(raw) : [];
    return Array.isArray(v) ? (v as T[]) : [];
  } catch {
    return [];
  }
}

export function getAllFieldsPure(): CoreFieldDef[] {
  return readArray<CoreFieldDef>(FIELD_REGISTRY_KEY);
}

function appliesToModule(def: { module: string; isReusable?: boolean; reusableModules?: string[] }, module: string): boolean {
  if (def.module === module) return true;
  if (!def.isReusable) return false;
  return !def.reusableModules || def.reusableModules.length === 0 || def.reusableModules.includes(module);
}

/** Fields shown for `module` (own + reusable). For module "process", `processId` narrows by `processIds` scoping. */
export function getFieldsForModulePure(module: string, processId?: string): CoreFieldDef[] {
  return getAllFieldsPure().filter((f) => {
    if (!appliesToModule(f, module)) return false;
    if (module === "process" && f.processIds && f.processIds.length > 0) {
      return !!processId && f.processIds.includes(processId);
    }
    return true;
  });
}

export function getSectionsPure(module: string, processId?: string): CoreSectionDef[] {
  return readArray<CoreSectionDef>(SECTION_REGISTRY_KEY).filter((s) => {
    if (!appliesToModule(s, module)) return false;
    if (module === "process" && s.processIds && s.processIds.length > 0) {
      return !!processId && s.processIds.includes(processId);
    }
    return true;
  });
}

export function getFieldByKeyPure(key: string, module?: string): CoreFieldDef | undefined {
  return getAllFieldsPure().find((f) => f.key === key && (!module || appliesToModule(f, module)));
}
