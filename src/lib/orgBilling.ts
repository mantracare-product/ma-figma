/**
 * Organization billing identity (R2.6): the ONE place for the billing entity (legal name, EIN, group NPI, taxonomy,
 * billing phone / address / contact) and for the place-of-service code of each location. It is edited in the
 * Organization detail drawer (Billing Info + Locations). The claim builder, the scrubber and eligibility read it from
 * here; the old Billing setup "Billing entity" and "Locations & POS" stores are migrated into it once and no longer used.
 */
import { billingEntityStore, billingLocationsStore, claimDefaultsStore } from "./billingSetupStore";

export const ORG_BILLING_EVENT = "mantra_org_billing_updated";
const MIGRATED_FLAG = "mantra_org_billing_migrated_v1";

export interface OrgBilling {
  legalName: string;
  ein: string;
  /** Group (billing) NPI. */
  groupNpi: string;
  taxonomy: string;
  phone: string;
  address: string;
  contactName: string;
  contactEmail: string;
}

export interface OrgLocationPos {
  id: string;
  name: string;
  /** Place-of-service code, e.g. "11". */
  pos: string;
  address: string;
}

const EMPTY: OrgBilling = { legalName: "", ein: "", groupNpi: "", taxonomy: "", phone: "", address: "", contactName: "", contactEmail: "" };

const billingKey = (orgId: string) => `mantra_org_billing_${orgId}`;
const locationsKey = (orgId: string) => `mantra_org_locations_${orgId}`;

export function getActiveOrgId(): string {
  try { return localStorage.getItem("mantra_active_org_id_v1") || "demo"; } catch { return "demo"; }
}

function orgRecord(orgId: string): any {
  try {
    const list = JSON.parse(localStorage.getItem("mantra_organizations_v1") || "[]");
    return Array.isArray(list) ? list.find((o: any) => o && o.id === orgId) : undefined;
  } catch { return undefined; }
}

export function getOrgBilling(orgId: string = getActiveOrgId()): OrgBilling {
  let stored: Partial<OrgBilling> = {};
  try { stored = JSON.parse(localStorage.getItem(billingKey(orgId)) || "{}") || {}; } catch { /* ignore */ }
  const org = orgRecord(orgId);
  return {
    ...EMPTY,
    legalName: stored.legalName || "",
    ein: stored.ein || "",
    groupNpi: stored.groupNpi || "",
    taxonomy: stored.taxonomy || "",
    phone: stored.phone || "",
    address: stored.address || org?.address || "",
    contactName: stored.contactName || "",
    contactEmail: stored.contactEmail || "",
  };
}

export function saveOrgBilling(orgId: string, patch: Partial<OrgBilling>): OrgBilling {
  const next = { ...getOrgBilling(orgId), ...patch };
  try { localStorage.setItem(billingKey(orgId), JSON.stringify(next)); } catch { /* ignore */ }
  try { window.dispatchEvent(new Event(ORG_BILLING_EVENT)); } catch { /* ignore */ }
  return next;
}

/** True when the billing entity the claim builder needs (legal name + group NPI) is filled in. */
export const hasBillingEntity = (b: OrgBilling = getOrgBilling()) => !!(b.legalName && b.groupNpi);

function readLocations(orgId: string): any[] {
  try {
    const list = JSON.parse(localStorage.getItem(locationsKey(orgId)) || "null");
    return Array.isArray(list) ? list : [];
  } catch { return []; }
}

/** Locations with their POS code (default 11 for a physical location, 02 for an online one). */
export function getOrgLocations(orgId: string = getActiveOrgId()): OrgLocationPos[] {
  return readLocations(orgId).map((l) => ({
    id: String(l.id),
    name: String(l.name || "Location"),
    pos: String(l.pos || (l.type === "online" ? "02" : "11")),
    address: String(l.address || ""),
  }));
}

/** One-time move of the old Billing setup entity + locations into the organization record. Never overwrites. */
export function migrateBillingSetupToOrg(orgId: string = getActiveOrgId()): { migrated: boolean } {
  try {
    if (localStorage.getItem(MIGRATED_FLAG) === "1") return { migrated: false };
    const entity = billingEntityStore.get();
    const current = getOrgBilling(orgId);
    if (!current.legalName && !current.ein && !current.groupNpi && (entity.legalName || entity.ein || entity.npi)) {
      saveOrgBilling(orgId, { legalName: entity.legalName, ein: entity.ein, groupNpi: entity.npi, taxonomy: entity.taxonomy, phone: entity.phone, address: entity.address });
    }
    const old = billingLocationsStore.get();
    if (old.length) {
      const list = readLocations(orgId);
      const idMap: Record<string, string> = {};
      for (const o of old) {
        const match = list.find((l) => String(l.name || "").trim().toLowerCase() === o.name.trim().toLowerCase());
        if (match) {
          if (!match.pos) match.pos = o.pos;
          idMap[o.id] = String(match.id);
        } else {
          const id = `loc-${o.id}`;
          list.push({ id, name: o.name, type: "physical", address: o.address || "", pos: o.pos, isPrimary: list.length === 0 });
          idMap[o.id] = id;
        }
      }
      localStorage.setItem(locationsKey(orgId), JSON.stringify(list));
      const defaults = claimDefaultsStore.get();
      if (defaults.defaultBillingLocationId && idMap[defaults.defaultBillingLocationId]) {
        claimDefaultsStore.save({ ...defaults, defaultBillingLocationId: idMap[defaults.defaultBillingLocationId] });
      }
    }
    localStorage.setItem(MIGRATED_FLAG, "1");
    return { migrated: true };
  } catch {
    return { migrated: false };
  }
}
