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

let perms: typeof import("../permissions");
let rolesStore: typeof import("../rolesStore");
let sample: typeof import("../rcmSampleRoles");

beforeAll(async () => {
  (globalThis as any).window = { dispatchEvent: () => true, addEventListener: () => {}, removeEventListener: () => {} };
  (globalThis as any).localStorage = new MemStorage();
  (globalThis as any).sessionStorage = new MemStorage();
  perms = await import("../permissions");
  rolesStore = await import("../rolesStore");
  sample = await import("../rcmSampleRoles");
});

beforeEach(() => {
  (globalThis as any).localStorage = new MemStorage();
  (globalThis as any).sessionStorage = new MemStorage();
});

const billingOnly = () => sample.buildSampleRcmRoles().find((r) => r.id === "sample-rcm-billing-setup")!;

describe("record-less permission checks", () => {
  it("a role with only billingSetup opens billing setup and nothing in settings", () => {
    const r = billingOnly();
    expect(perms.hasPermission(r, "billingSetup", "read")).toBe(true);
    expect(perms.hasPermission(r, "settings", "read")).toBe(false);
    expect(perms.hasPermission(r, "claims", "read")).toBe(false);
  });

  it("missing role, missing key and 'inherit' are all denied", () => {
    expect(perms.hasPermission(undefined, "billingSetup")).toBe(false);
    expect(perms.hasPermission({ id: "x", name: "x", permissions: {} as any }, "billingSetup")).toBe(false);
    expect(perms.hasPermission({ id: "x", name: "x", permissions: { billingSetup: { read: "inherit" } } as any }, "billingSetup")).toBe(false);
  });
});

describe("user -> team member -> roleId -> role", () => {
  const roles = () => sample.buildSampleRcmRoles();

  it("resolves by email then roleId; name match is only a fallback", () => {
    const members = [
      { email: "Biller@Clinic.com", role: "Whatever", roleId: "sample-rcm-biller" },
      { email: "old@clinic.com", role: "Biller" },
      { email: "none@clinic.com", role: "Ophthalmologist" },
    ];
    const m1 = perms.findMemberByEmail(members, "biller@clinic.com");
    expect(perms.resolveMemberRole(m1, roles())).toMatchObject({ via: "roleId" });
    expect(perms.resolveMemberRole(perms.findMemberByEmail(members, "old@clinic.com"), roles())).toMatchObject({ via: "name" });
    expect(perms.resolveMemberRole(perms.findMemberByEmail(members, "none@clinic.com"), roles()).role).toBeUndefined();
    expect(perms.findMemberByEmail(members, "nobody@x.com")).toBeUndefined();
  });

  it("only an explicit roleId without full settings access makes a non-admin session", () => {
    const rs = roles();
    expect(perms.sessionRoleForMember({ roleId: "sample-rcm-billing-setup" }, rs, "SystemAdmin")).toBe("Member");
    expect(perms.sessionRoleForMember({ role: "Biller" }, rs, "SystemAdmin")).toBe("SystemAdmin");
    expect(perms.sessionRoleForMember(undefined, rs, "SystemAdmin")).toBe("SystemAdmin");
    expect(perms.sessionRoleForMember({ roleId: "unknown" }, rs, "SystemAdmin")).toBe("SystemAdmin");
  });
});

describe("rolesStore", () => {
  it("migrates the old session list, persists defaults, and adds sample roles once", () => {
    sessionStorage.setItem("settings_roles", JSON.stringify([{ id: "legacy", name: "Legacy", permissions: {} }]));
    expect(rolesStore.getStoredRoles([]).map((r) => r.id)).toEqual(["legacy"]);
    expect(JSON.parse(localStorage.getItem(rolesStore.ROLES_STORAGE_KEY)!)).toHaveLength(1);

    const first = rolesStore.addRolesIfMissing(sample.buildSampleRcmRoles());
    const second = rolesStore.addRolesIfMissing(sample.buildSampleRcmRoles());
    expect(first.added).toBe(3);
    expect(second.added).toBe(0);
    expect(rolesStore.getStoredRoles()).toHaveLength(4);
  });
});
