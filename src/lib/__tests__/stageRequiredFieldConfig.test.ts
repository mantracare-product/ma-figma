import { describe, it, expect, beforeEach } from "vitest";
import React from "react";
import { renderToString } from "react-dom/server";

class MemStorage {
  private m = new Map<string, string>();
  get length() { return this.m.size; }
  key(i: number) { return Array.from(this.m.keys())[i] ?? null; }
  getItem(k: string) { return this.m.has(k) ? (this.m.get(k) as string) : null; }
  setItem(k: string, v: string) { this.m.set(k, String(v)); }
  removeItem(k: string) { this.m.delete(k); }
  clear() { this.m.clear(); }
}

describe("FieldRegistry stage-required configuration", () => {
  beforeEach(() => {
    const mem = new MemStorage();
    (globalThis as any).localStorage = mem;
    (globalThis as any).sessionStorage = mem;
    (globalThis as any).window = {
      localStorage: mem,
      sessionStorage: mem,
      dispatchEvent: () => true,
      addEventListener: () => {},
      removeEventListener: () => {},
    };
  });

  it("updates system field with stage requirements in process module", async () => {
    const { useFieldRegistry } = await import("../../app/context/FieldRegistryContext");
    
    let result: any;
    let updateFn: any;
    function Comp() {
      const reg = useFieldRegistry();
      updateFn = reg.updateCustomField;
      result = reg.getAllFields("process");
      return null;
    }
    renderToString(React.createElement(Comp));

    const resp = result.find((f: any) => f.key === "responsible");
    expect(resp).toBeDefined();

    updateFn("process", resp.id, {
      key: "responsible",
      required: true,
      requiredStages: ["all"],
    });

    renderToString(React.createElement(Comp));
    const updatedResp = result.find((f: any) => f.key === "responsible");
    expect(updatedResp.required).toBe(true);
    expect(updatedResp.requiredStages).toEqual(["all"]);
  });

  it("updates shared client field like phone with stage requirements in process module", async () => {
    const { useFieldRegistry } = await import("../../app/context/FieldRegistryContext");
    
    let result: any;
    let updateFn: any;
    function Comp() {
      const reg = useFieldRegistry();
      updateFn = reg.updateCustomField;
      result = reg.getAllFields("process");
      return null;
    }
    renderToString(React.createElement(Comp));

    updateFn("process", -999, {
      key: "phone",
      required: true,
      requiredStages: ["Book Appointment"],
    });

    renderToString(React.createElement(Comp));
    const updatedPhone = result.find((f: any) => f.key === "phone");
    expect(updatedPhone.required).toBe(true);
    expect(updatedPhone.requiredStages).toEqual(["Book Appointment"]);
  });

  it("updates country in fallback useFieldRegistry and verifies DraggableOverviewSections combined fields", async () => {
    const { useFieldRegistry } = await import("../../app/context/FieldRegistryContext");
    
    let allFields: any = {};
    let updateFn: any;
    function Comp() {
      const reg = useFieldRegistry();
      updateFn = reg.updateCustomField;
      allFields = {
        process: reg.getAllFields("process"),
        client: reg.getAllFields("client"),
      };
      return null;
    }
    renderToString(React.createElement(Comp));

    const combined = [...allFields.process, ...allFields.client];
    const countryField = combined.find((f: any) => f.key === "country");
    expect(countryField).toBeDefined();

    updateFn("process", countryField.id, {
      key: countryField.key,
      required: true,
      requiredStages: ["all"],
    });

    renderToString(React.createElement(Comp));
    const newCombined = [...allFields.process, ...allFields.client];
    const updatedCountry = newCombined.find((f: any) => f.key === "country");
    expect(updatedCountry.required).toBe(true);
  });
});
