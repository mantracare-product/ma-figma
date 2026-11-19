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

let cov: typeof import("../coveragesStore");
let clientIns: typeof import("../clientInsurance");
const CLIENT_ID = "CL-TEST-100";

function fresh() {
  (globalThis as any).localStorage = new MemStorage();
  (globalThis as any).sessionStorage = new MemStorage();
  (globalThis as any).window.localStorage = (globalThis as any).localStorage;
  (globalThis as any).window.sessionStorage = (globalThis as any).sessionStorage;
}

beforeAll(async () => {
  (globalThis as any).window = { dispatchEvent: () => true, addEventListener: () => {}, removeEventListener: () => {} };
  (globalThis as any).CustomEvent = class { constructor(public type: string) {} };
  fresh();
  cov = await import("../coveragesStore");
  clientIns = await import("../clientInsurance");
});

beforeEach(() => {
  fresh();
  localStorage.setItem("clients", JSON.stringify([{ id: CLIENT_ID, name: "Test Client", consents: {} }]));
});

describe("Client Insurance: Overview coverages table & consents", () => {
  const CLIENT_ID = "CL-TEST-100";

  it("returns empty coverages array for a client with no coverages", () => {
    const vals = clientIns.insuranceValuesFor(CLIENT_ID);
    expect(vals.ins_coverages).toEqual([]);
    expect(vals.consent_sms).toBe(false);
    expect(vals.consent_voice).toBe(false);
    expect(vals.consent_cardOnFile).toBe(false);
  });

  it("allows adding a new empty row (+ Add Row) without dropping it", () => {
    // When the user clicks "+ Add Row", TableInputRenderer passes a new row with empty fields and a temporary id
    const newRow = {
      id: "row_1795087314935",
      payer: "",
      member_id: "",
      group: "",
      priority: "",
      effective: "",
      term: "",
      subscriber: "",
    };

    const handled = clientIns.saveInsuranceField(CLIENT_ID, "ins_coverages", [newRow]);
    expect(handled).toBe(true);

    // Coverages store and insuranceValuesFor must now contain this row
    const vals = clientIns.insuranceValuesFor(CLIENT_ID);
    expect(vals.ins_coverages).toHaveLength(1);
    const row = vals.ins_coverages[0];
    expect(row.id).toBeDefined();
    expect(row.id).toMatch(/^cov-/);
    expect(row.payer).toBe("");
    expect(row.member_id).toBe("");
    expect(row.priority).toBe("primary");
  });

  it("updates existing coverage fields when user types in cells", () => {
    // 1. User adds row
    clientIns.saveInsuranceField(CLIENT_ID, "ins_coverages", [
      { id: "row_1", payer: "", member_id: "", priority: "" },
    ]);
    const row1 = clientIns.insuranceValuesFor(CLIENT_ID).ins_coverages[0];
    expect(row1.priority).toBe("primary");

    // 2. User selects payer and enters member ID
    const updated = [
      {
        ...row1,
        payer: "payer-bcbs",
        member_id: "BCBS-98765",
        group: "GRP-441",
        subscriber: "John Doe",
      },
    ];
    clientIns.saveInsuranceField(CLIENT_ID, "ins_coverages", updated);

    const reloaded = clientIns.insuranceValuesFor(CLIENT_ID).ins_coverages;
    expect(reloaded).toHaveLength(1);
    expect(reloaded[0].id).toBe(row1.id);
    expect(reloaded[0].payer).toBe("payer-bcbs");
    expect(reloaded[0].member_id).toBe("BCBS-98765");
    expect(reloaded[0].group).toBe("GRP-441");
    expect(reloaded[0].subscriber).toBe("John Doe");
    expect(reloaded[0].priority).toBe("primary");
  });

  it("assigns sequential priorities (primary -> secondary -> tertiary) for multiple rows", () => {
    // Add primary
    clientIns.saveInsuranceField(CLIENT_ID, "ins_coverages", [
      { id: "row_1", payer: "payer-1", member_id: "M-1" },
    ]);
    const r1 = clientIns.insuranceValuesFor(CLIENT_ID).ins_coverages[0];

    // Add secondary
    clientIns.saveInsuranceField(CLIENT_ID, "ins_coverages", [
      r1,
      { id: "row_2", payer: "payer-2", member_id: "M-2" },
    ]);
    const rows2 = clientIns.insuranceValuesFor(CLIENT_ID).ins_coverages;
    expect(rows2).toHaveLength(2);
    expect(rows2[0].priority).toBe("primary");
    expect(rows2[1].priority).toBe("secondary");

    // Add tertiary
    clientIns.saveInsuranceField(CLIENT_ID, "ins_coverages", [
      rows2[0],
      rows2[1],
      { id: "row_3", payer: "payer-3", member_id: "M-3" },
    ]);
    const rows3 = clientIns.insuranceValuesFor(CLIENT_ID).ins_coverages;
    expect(rows3).toHaveLength(3);
    expect(rows3[0].priority).toBe("primary");
    expect(rows3[1].priority).toBe("secondary");
    expect(rows3[2].priority).toBe("tertiary");
  });

  it("removes deleted rows from coveragesStore", () => {
    // Seed 2 rows
    clientIns.saveInsuranceField(CLIENT_ID, "ins_coverages", [
      { id: "row_1", payer: "p1", member_id: "m1" },
      { id: "row_2", payer: "p2", member_id: "m2" },
    ]);
    const rows = clientIns.insuranceValuesFor(CLIENT_ID).ins_coverages;
    expect(rows).toHaveLength(2);

    // Delete first row (pass only second row)
    clientIns.saveInsuranceField(CLIENT_ID, "ins_coverages", [rows[1]]);

    const remaining = clientIns.insuranceValuesFor(CLIENT_ID).ins_coverages;
    expect(remaining).toHaveLength(1);
    expect(remaining[0].id).toBe(rows[1].id);
    expect(remaining[0].payer).toBe("p2");

    // Delete all rows
    clientIns.saveInsuranceField(CLIENT_ID, "ins_coverages", []);
    expect(clientIns.insuranceValuesFor(CLIENT_ID).ins_coverages).toHaveLength(0);
  });

  it("handles consent updates correctly", () => {
    clientIns.saveInsuranceField(CLIENT_ID, "consent_sms", true);
    clientIns.saveInsuranceField(CLIENT_ID, "consent_voice", true);
    clientIns.saveInsuranceField(CLIENT_ID, "consent_cardOnFile", false);

    const vals = clientIns.insuranceValuesFor(CLIENT_ID);
    expect(vals.consent_sms).toBe(true);
    expect(vals.consent_voice).toBe(true);
    expect(vals.consent_cardOnFile).toBe(false);
  });
});
