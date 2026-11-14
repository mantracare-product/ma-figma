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

let store: typeof import("../processLogsStore");
let writer: typeof import("../recordWriter");
let ctxLib: typeof import("../recordContext");
let core: typeof import("../fieldRegistryCore");
let upd: typeof import("../updateFieldsAction");
let runs: typeof import("../actionRuns");
let appts: typeof import("../appointmentService");

const rule: any = { id: "R1", name: "Write fields" };

function fresh() {
  (globalThis as any).localStorage = new MemStorage();
  (globalThis as any).sessionStorage = new MemStorage();
  (globalThis as any).window.localStorage = (globalThis as any).localStorage;
  (globalThis as any).window.sessionStorage = (globalThis as any).sessionStorage;
}

beforeAll(async () => {
  (globalThis as any).window = {
    dispatchEvent: () => true,
    addEventListener: () => {},
    removeEventListener: () => {},
  };
  (globalThis as any).CustomEvent = class { constructor(public type: string) {} };
  fresh();
  store = await import("../processLogsStore");
  writer = await import("../recordWriter");
  ctxLib = await import("../recordContext");
  core = await import("../fieldRegistryCore");
  upd = await import("../updateFieldsAction");
  runs = await import("../actionRuns");
  appts = await import("../appointmentService");
});

beforeEach(() => {
  fresh();
  store.__resetInstanceMigrationForTests();
  runs.__resetActionRunsForTests();
  localStorage.setItem("clients", JSON.stringify([{ id: "CL-T", name: "Test Patient", stage: "x", processes: [] }]));
});

function seedAppointment(): string {
  const a = appts.appointmentService.createAppointment(
    {
      clientName: "Test Patient", clientEmail: "t@x.com", clientPhone: "1", employeeId: 1, serviceId: 1,
      date: "2030-01-10", time: "10:00", duration: 30, clientId: "CL-T",
    } as any,
    { force: true, createdBy: "user" } as any
  );
  return String((a as any).id ?? (a as any).appointment?.id);
}

describe("fieldRegistryCore (read-only)", () => {
  it("reads own + reusable fields, scopes process fields, and never writes", () => {
    localStorage.setItem(
      core.FIELD_REGISTRY_KEY,
      JSON.stringify([
        { id: 1, key: "elig_status", label: "Status", module: "process", inputType: "text", processIds: ["p1"] },
        { id: 2, key: "auth_status", label: "Auth", module: "appointment", inputType: "text" },
        { id: 3, key: "shared", label: "Shared", module: "client", inputType: "text", isReusable: true, reusableModules: ["appointment"] },
      ])
    );
    const before = localStorage.getItem(core.FIELD_REGISTRY_KEY);
    expect(core.getFieldsForModulePure("process", "p1").map((f) => f.key)).toEqual(["elig_status"]);
    expect(core.getFieldsForModulePure("process", "p2")).toHaveLength(0);
    expect(core.getFieldsForModulePure("appointment").map((f) => f.key).sort()).toEqual(["auth_status", "shared"]);
    expect(core.getFieldByKeyPure("shared", "client")).toBeDefined();
    expect(localStorage.getItem(core.FIELD_REGISTRY_KEY)).toBe(before);
  });
});

describe("recordWriter", () => {
  it("merges (does not replace) drawer-local values and splits typed vs registry keys on appointments", () => {
    const id = seedAppointment();
    localStorage.setItem(`mantra_appt_fields_${id}`, JSON.stringify({ existing: "keep" }));
    const r = writer.writeRecordFields({ type: "appointment", id }, { notes: "typed", auth_status: "approved" });
    expect(r.ok).toBe(true);
    expect(appts.appointmentService.getAppointmentById(id)!.notes).toBe("typed");
    expect(JSON.parse(localStorage.getItem(`mantra_appt_fields_${id}`)!)).toEqual({ existing: "keep", auth_status: "approved" });
  });

  it("writes instance fields by instanceId and reports unknown records", () => {
    const { instance } = store.startProcessInstance({
      clientId: "CL-T", clientName: "Test Patient", processName: "P", stageName: "S",
      source: { type: "appointment", id: "9" },
    });
    expect(writer.writeRecordFields({ type: "process_instance", id: instance.instanceId! }, { elig_status: "active" }).ok).toBe(true);
    expect((store.getProcessInstanceById(instance.instanceId!) as any).elig_status).toBe("active");
    expect(writer.writeRecordFields({ type: "process_instance", id: "nope" }, { a: 1 }).ok).toBe(false);
    expect(writer.writeRecordFields({ type: "appointment", id: "nope" }, { a: 1 }).ok).toBe(false);
  });

  it("merges invoice fields and client fields", () => {
    writer.writeRecordFields({ type: "invoice", id: "INV-1" }, { a: 1 });
    writer.writeRecordFields({ type: "invoice", id: "INV-1" }, { b: 2 });
    expect(JSON.parse(localStorage.getItem("mantra_inv_fields_INV-1")!)).toEqual({ a: 1, b: 2 });
    expect(writer.writeRecordFields({ type: "client", id: "CL-T" }, { selfPay: true }).ok).toBe(true);
  });
});

describe("resolveRecordContext", () => {
  it("finds client, appointment and the instance created for that appointment", () => {
    const id = seedAppointment();
    const { instance } = store.startProcessInstance({
      clientId: "CL-T", clientName: "Test Patient", processName: "P", processId: "p1", stageName: "S",
      source: { type: "appointment", id },
    });
    const ctx = ctxLib.resolveRecordContext({ id: "E1", event: "appointment.booked", recordType: "appointment", recordId: id, timestamp: "" } as any);
    expect(ctx.clientId).toBe("CL-T");
    expect(ctx.appointmentId).toBe(id);
    expect(ctx.instance?.instanceId).toBe(instance.instanceId);

    const ctx2 = ctxLib.resolveRecordContext({ id: "E2", event: "stage.entered", recordType: "client", recordId: instance.instanceId, data: { clientId: "CL-T", instanceId: instance.instanceId }, timestamp: "" } as any);
    expect(ctx2.appointmentId).toBe(id);
  });
});

describe("update_fields action", () => {
  it("renders templates, writes to the instance + appointment, and is idempotent per event", () => {
    const id = seedAppointment();
    const { instance } = store.startProcessInstance({
      clientId: "CL-T", clientName: "Test Patient", processName: "P", stageName: "S",
      source: { type: "appointment", id },
    });
    const event: any = { id: "E9", event: "appointment.booked", recordType: "appointment", recordId: id, data: { clientId: "CL-T", payer: "Acme" }, timestamp: "" };
    const params = { targets: ["instance", "appointment"], fields: { elig_payer: "{{payer}}", auth_note: "for {{client.name}}" } };
    const a = upd.executeUpdateFieldsStep({ rule, stepId: "s", params, event });
    const b = upd.executeUpdateFieldsStep({ rule, stepId: "s", params, event });
    expect(a.status).toBe("success");
    expect(b.alreadyRan).toBe(true);
    expect((store.getProcessInstanceById(instance.instanceId!) as any).auth_note).toBe("for Test Patient");
    expect(JSON.parse(localStorage.getItem(`mantra_appt_fields_${id}`)!).elig_payer).toBe("Acme");
  });

  it("records a failed run when no target resolves", () => {
    const r = upd.executeUpdateFieldsStep({
      rule, stepId: "s", params: { targets: ["claim"], fields: { a: "1" } },
      event: { id: "E1", event: "x", recordType: "client", recordId: "CL-T", timestamp: "" } as any,
    });
    expect(r.status).toBe("failed");
    expect(runs.getActionHealth().failed).toBe(1);
  });
});
