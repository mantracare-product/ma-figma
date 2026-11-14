import { describe, it, expect, beforeAll, beforeEach } from "vitest";

class MemStorage {
  private m = new Map<string, string>();
  get length() { return this.m.size; }
  key(i: number) { return Array.from(this.m.keys())[i] ?? null; }
  getItem(k: string) { return this.m.has(k) ? (this.m.get(k) as string) : null; }
  setItem(k: string, v: string) { this.m.set(k, String(v)); }
  removeItem(k: string) { this.m.delete(k); }
  clear() { this.m.clear(); }
}

let req: typeof import("../claimFieldRequirements");
let validation: typeof import("../processFieldValidation");

function fresh() {
  (globalThis as any).localStorage = new MemStorage();
  (globalThis as any).sessionStorage = new MemStorage();
  (globalThis as any).window.localStorage = (globalThis as any).localStorage;
  (globalThis as any).window.sessionStorage = (globalThis as any).sessionStorage;
}

beforeAll(async () => {
  (globalThis as any).window = { dispatchEvent: () => true, addEventListener: () => {}, removeEventListener: () => {} };
  fresh();
  req = await import("../claimFieldRequirements");
  validation = await import("../processFieldValidation");
});
beforeEach(fresh);

const field = (key: string, extra: any = {}) => ({ id: 1, key, label: key.toUpperCase(), module: "claim", inputType: "text", source: "custom", required: true, ...extra });
const setRegistry = (fields: any[]) => localStorage.setItem("mantra_field_registry_v1", JSON.stringify({ claim: fields }));
const claim: any = { id: "clm-1", processId: "wf-claim", denialReason: "" };

describe("required-at-stage for claim fields", () => {
  it("requires a field only at its stages, and not when filled (typed property or drawer-local value)", () => {
    setRegistry([field("denialReason", { requiredStages: ["Appeal drafted"] })]);
    expect(req.getMissingRequiredClaimFields(claim, "New denial")).toHaveLength(0);
    expect(req.getMissingRequiredClaimFields(claim, "appeal drafted").map((m) => m.key)).toEqual(["denialReason"]);
    localStorage.setItem("mantra_claim_fieldvalues_clm-1", JSON.stringify({ denialReason: "CO-97" }));
    expect(req.getMissingRequiredClaimFields(claim, "Appeal drafted")).toHaveLength(0);
  });

  it("no requiredStages = every stage; workflowIds scopes the field to some workflows", () => {
    setRegistry([field("a"), field("b", { workflowIds: ["wf-other"] })]);
    expect(req.getMissingRequiredClaimFields(claim, "Anything").map((m) => m.key)).toEqual(["a"]);
    expect(req.getMissingRequiredClaimFields({ ...claim, processId: "wf-other" }, "Anything").map((m) => m.key).sort()).toEqual(["a", "b"]);
  });

  it("optional fields are never required", () => {
    setRegistry([field("c", { required: false })]);
    expect(req.getMissingRequiredClaimFields(claim, "x")).toHaveLength(0);
  });
});

describe("N16: a required table with only blank rows is empty", () => {
  it("blank rows count as empty, a filled row does not", () => {
    expect(validation.isFieldValueEmpty([{ a: "", b: " " }])).toBe(true);
    expect(validation.isFieldValueEmpty([{ a: "", b: "" }, { a: "", b: "-" }])).toBe(true);
    expect(validation.isFieldValueEmpty([{ a: "", b: "x" }])).toBe(false);
    expect(validation.isFieldValueEmpty(["x"])).toBe(false);
    expect(validation.isFieldValueEmpty([])).toBe(true);
  });
});
