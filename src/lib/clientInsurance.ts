/**
 * Insurance section of the client's Overview (R3.2): the registry table field `ins_coverages` and the consent
 * fields are views over the coverages store and the client record. Pure helpers, no React.
 */
import {
  getClientDemographics,
  getCoveragesForClient,
  removeCoverage,
  saveClientDemographics,
  saveCoverage,
  type Coverage,
  type CoveragePriority,
} from "./coveragesStore";

export const INSURANCE_SECTION_ID = "sec-insurance";
export const INSURANCE_FIELD_KEYS = ["ins_coverages", "guarantor", "selfPay", "consent_sms", "consent_voice", "consent_cardOnFile", "dob", "sex", "address"];

const ORDER: CoveragePriority[] = ["primary", "secondary", "tertiary"];

const rowOf = (c: Coverage) => ({
  id: c.id,
  payer: c.payerId || "",
  member_id: c.memberId || "",
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
    // Keep all incoming rows including newly added empty rows
    const rows: any[] = Array.isArray(value) ? value.filter((r) => r != null && typeof r === "object") : [];
    const existing = getCoveragesForClient(clientId);
    const existingById = new Map<string, Coverage>(existing.map((c) => [c.id, c]));

    // Track which existing coverages are still referenced by incoming rows
    const incomingExistingIds = new Set<string>();
    rows.forEach((r, idx) => {
      const match = (r.id && existingById.get(r.id)) || (!r.id && existing[idx]);
      if (match) incomingExistingIds.add(match.id);
    });

    // Remove coverages that were deleted in the UI
    existing.forEach((c) => {
      if (!incomingExistingIds.has(c.id)) {
        removeCoverage(c.id);
      }
    });

    // Determine available priorities without accidental collisions
    const usedPriorities = new Set<CoveragePriority>();
    rows.forEach((r) => {
      if (r && ORDER.includes(r.priority)) {
        usedPriorities.add(r.priority);
      }
    });

    rows.forEach((r, i) => {
      const matched = (r.id && existingById.get(r.id)) || (!r.id && existing[i]);
      const covId = matched ? matched.id : (r.id && !String(r.id).startsWith("row_") ? String(r.id) : undefined);

      let priority: CoveragePriority;
      if (ORDER.includes(r.priority)) {
        priority = r.priority;
      } else if (matched?.priority) {
        priority = matched.priority;
        usedPriorities.add(priority);
      } else {
        const free = ORDER.find((p) => !usedPriorities.has(p));
        priority = free || (i === 0 ? "primary" : i === 1 ? "secondary" : "tertiary");
        usedPriorities.add(priority);
      }

      saveCoverage({
        ...(matched || {}),
        id: covId,
        clientId,
        payerId: String(r.payer ?? matched?.payerId ?? ""),
        memberId: String(r.member_id ?? matched?.memberId ?? ""),
        groupNumber: r.group !== undefined ? (r.group || undefined) : matched?.groupNumber,
        priority,
        effectiveDate: r.effective !== undefined ? (r.effective || undefined) : matched?.effectiveDate,
        termDate: r.term !== undefined ? (r.term || undefined) : matched?.termDate,
        subscriberName: r.subscriber !== undefined ? (r.subscriber || undefined) : matched?.subscriberName,
        sample: false,
      });
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
