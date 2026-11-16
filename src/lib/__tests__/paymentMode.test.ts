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
let pm: typeof import("../paymentMode");
let appts: typeof import("../appointmentService");
let cov: typeof import("../coveragesStore");

beforeAll(async () => {
  (globalThis as any).localStorage = new MemStorage();
  (globalThis as any).sessionStorage = new MemStorage();
  (globalThis as any).window = { localStorage: (globalThis as any).localStorage, dispatchEvent: () => true, addEventListener: () => {}, removeEventListener: () => {} };
  (globalThis as any).CustomEvent = class { constructor(public type: string) {} };
  pm = await import("../paymentMode");
  cov = await import("../coveragesStore");
  appts = await import("../appointmentService");
});
beforeEach(() => { localStorage.clear(); sessionStorage.clear(); });

const services = (list: any[]) => localStorage.setItem("ma_services_demo", JSON.stringify(list));

describe("payment mode", () => {
  it("defaults from the service flag; a non-billable service is always self-pay; unconfirmed only for call-style bookings without an answer", () => {
    services([{ id: 1, name: "Visit", billableToInsurance: true }, { id: 2, name: "Cosmetic", billableToInsurance: false }]);
    expect(pm.resolvePaymentMode({ serviceId: 1, source: "screen" })).toEqual({ mode: "insurance", unconfirmed: false });
    expect(pm.resolvePaymentMode({ serviceId: 2, source: "screen" })).toEqual({ mode: "self_pay", unconfirmed: false });
    expect(pm.resolvePaymentMode({ serviceId: 1, requested: "self_pay" })).toEqual({ mode: "self_pay", unconfirmed: false });
    expect(pm.resolvePaymentMode({ serviceId: 2, requested: "insurance" }).mode).toBe("self_pay");
    expect(pm.resolvePaymentMode({ serviceId: 1, source: "Inbound Call" })).toEqual({ mode: "insurance", unconfirmed: true });
    expect(pm.resolvePaymentMode({ serviceId: 1, requested: "insurance", source: "Inbound Call" }).unconfirmed).toBe(false);
  });

  it("creating an appointment stores the mode (and saves payer + member id as the primary coverage when none exists)", () => {
    services([{ id: 1, name: "Visit", billableToInsurance: true, duration: 30, price: 10, currency: "USD", isActive: true, description: "" }]);
    localStorage.setItem("clients", JSON.stringify([{ id: "CL-1", name: "Pat One", email: "p@x.com", phone: "1", stage: "x", processes: [] }]));
    const a = appts.appointmentService.createAppointment(
      { clientName: "Pat One", clientEmail: "p@x.com", clientPhone: "1", employeeId: 1, serviceId: 1, date: "2031-01-02", time: "10:00", clientId: "CL-1", source: "Inbound Call", payerId: "payer-bcbs", memberId: "M123" },
      { force: true, createdBy: "test" }
    ).appointment as any;
    expect(a).toMatchObject({ paymentMode: "insurance", paymentModeUnconfirmed: true });
    expect(cov.getCoveragesForClient("CL-1")).toMatchObject([{ payerId: "payer-bcbs", memberId: "M123", priority: "primary" }]);
  });

  it("migration: billable flag from CPT / prior-auth default, existing appointments self-pay unless covered and billable; once", () => {
    services([{ id: 1, name: "Visit", cptCode: "99213" }, { id: 2, name: "Cosmetic" }]);
    localStorage.setItem("clients", JSON.stringify([{ id: "CL-1", name: "A", stage: "x", processes: [] }, { id: "CL-2", name: "B", stage: "x", processes: [] }]));
    cov.coveragesStore.save([{ id: "c1", clientId: "CL-1", payerId: "payer-bcbs", memberId: "1", priority: "primary" }]);
    localStorage.setItem("appointments_v1", JSON.stringify([
      { id: 1, clientId: "CL-1", serviceId: 1, clientName: "A" }, { id: 2, clientId: "CL-2", serviceId: 1, clientName: "B" },
      { id: 3, clientId: "CL-1", serviceId: 2, clientName: "A" }, { id: 4, clientId: "CL-1", serviceId: 1, clientName: "A", paymentMode: "self_pay" },
    ]));
    expect(pm.migratePaymentModes()).toEqual({ services: 1, appointments: 3 });
    const list = JSON.parse(localStorage.getItem("appointments_v1")!);
    expect(list.map((x: any) => x.paymentMode)).toEqual(["insurance", "self_pay", "self_pay", "self_pay"]);
    expect(pm.migratePaymentModes()).toEqual({ services: 0, appointments: 0 });
  });
});
