/**
 * Insurance section of the client's Overview (R3.2): the registry table field `ins_coverages` and the consent
 * fields are views over the coverages store and the client record. Pure helpers, no React.
 */
import { getClientDemographics, getCoveragesForClient, removeCoverage, saveClientDemographics, saveCoverage, type Coverage } from "./coveragesStore";

export const INSURANCE_SECTION_ID = "sec-insurance";
export const INSURANCE_FIELD_KEYS = ["ins_coverages", "guarantor", "selfPay", "consent_sms", "consent_voice", "consent_cardOnFile", "dob", "sex", "address"];

const rowOf = (c: Coverage) => ({
  payer: c.payerId,
  member_id: c.memberId,
  group: c.groupNumber || "",
  priority: c.priority,
  effective: c.effectiveDate || "",
  term: c.termDate || "",
  subscriber: c.subscriberName || "",
});

/** Values the Overview needs that are not plain properties of the client record. */
export function insuranceValuesFor(clientId: string): Record<string, any> {
  const d = getClientDemographics(clientId);
  return {
    ins_coverages: getCoveragesForClient(clientId).map(rowOf),
    consent_sms: !!d.consents?.sms,
    consent_voice: !!d.consents?.voice,
    consent_cardOnFile: !!d.consents?.cardOnFile,
  };
}

export const isInsuranceKey = (key: string) => key === "ins_coverages" || key.startsWith("consent_");

/** Write a changed insurance field through to the coverages store / client record. Returns true when handled. */
export function saveInsuranceField(clientId: string, key: string, value: any): boolean {
  if (key === "ins_coverages") {
    // Table rows <-> coverages: row i updates the i-th existing coverage; extra rows are added, missing rows removed.
    const rows: any[] = Array.isArray(value) ? value.filter((r) => r && (r.member_id || r.payer)) : [];
    const existing = getCoveragesForClient(clientId);
    existing.slice(rows.length).forEach((c) => removeCoverage(c.id));
    rows.forEach((r, i) => {
      const prev = existing[i];
      saveCoverage({
        ...(prev || {}),
        id: prev?.id,
        clientId,
        payerId: String(r.payer || prev?.payerId || ""),
        memberId: String(r.member_id || ""),
        groupNumber: r.group || undefined,
        priority: (["primary", "secondary", "tertiary"].includes(r.priority) ? r.priority : prev?.priority || (i === 0 ? "primary" : i === 1 ? "secondary" : "tertiary")) as Coverage["priority"],
        effectiveDate: r.effective || undefined,
        termDate: r.term || undefined,
        subscriberName: r.subscriber || undefined,
        sample: false,
      } as any);
    });
    return true;
  }
  if (key.startsWith("consent_")) {
    const cur = getClientDemographics(clientId).consents || {};
    saveClientDemographics(clientId, { consents: { ...cur, [key.replace("consent_", "")]: !!value } });
    return true;
  }
  return false;
}

/** Link that opens the client's Overview tab, scrolled to and highlighting the Insurance section. */
export const insuranceLink = (clientId: string) => `/clients/${encodeURIComponent(String(clientId).replace(/^#/, ""))}?section=insurance`;
