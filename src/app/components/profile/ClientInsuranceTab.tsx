import { useCallback, useEffect, useMemo, useState } from "react";
import DraggableOverviewSections, { type OverviewSection } from "./DraggableOverviewSections";
import { useFieldRegistry } from "../../context/FieldRegistryContext";
import { ensureRcmFieldSeeds, SEC_BILLING_DEMOGRAPHICS, SEC_COVERAGES } from "../../../lib/rcmFieldSeeds";
import {
  COVERAGES_EVENT,
  getClientDemographics,
  getCoveragesForClient,
  removeCoverage,
  saveClientDemographics,
  saveCoverage,
  type Coverage,
} from "../../../lib/coveragesStore";
import { BILLING_SETUP_EVENT } from "../../../lib/billingSetupStore";
import { getStoredClients } from "../../../lib/clientsStore";

const SECTIONS_KEY = "ma_client_insurance_sections_v1";

const DEFAULT_SECTIONS: OverviewSection[] = [
  { id: SEC_BILLING_DEMOGRAPHICS, title: "Billing demographics", description: "Legal name, date of birth, guarantor and consents used for billing", iconName: "user", source: "custom", module: "client", fieldKeys: ["legalFirstName", "legalLastName", "dob", "sex", "address", "guarantor", "selfPay", "consent_sms", "consent_voice", "consent_cardOnFile"] },
  { id: SEC_COVERAGES, title: "Coverages", description: "Insurance coverages in priority order", iconName: "shield", source: "custom", module: "client", fieldKeys: ["ins_coverages"] },
];

const rowOf = (c: Coverage) => ({
  payer: c.payerId,
  member_id: c.memberId,
  group: c.groupNumber || "",
  priority: c.priority,
  effective: c.effectiveDate || "",
  term: c.termDate || "",
  subscriber: c.subscriberName || "",
});

function valuesFor(clientId: string): Record<string, any> {
  const d = getClientDemographics(clientId);
  return {
    legalFirstName: d.legalFirstName || "",
    legalLastName: d.legalLastName || "",
    dob: d.dob || "",
    sex: d.sex || "",
    address: d.address || "",
    guarantor: d.guarantor || "",
    selfPay: !!d.selfPay,
    consent_sms: !!d.consents?.sms,
    consent_voice: !!d.consents?.voice,
    consent_cardOnFile: !!d.consents?.cardOnFile,
    ins_coverages: getCoveragesForClient(clientId).map(rowOf),
  };
}

/** Client profile > Insurance tab, rendered by the field registry (sections + custom fields), like the other tabs. */
export default function ClientInsuranceTab({ clientId }: { clientId: string }) {
  const { getSectionsForOrg } = useFieldRegistry() as any;
  const [ready, setReady] = useState(false);
  const [values, setValues] = useState<Record<string, any>>(() => valuesFor(clientId));
  const [sections, setSections] = useState<OverviewSection[]>(() => {
    try {
      const raw = localStorage.getItem(SECTIONS_KEY);
      const parsed = raw ? JSON.parse(raw) : null;
      if (Array.isArray(parsed) && parsed.length) return parsed;
    } catch { /* ignore */ }
    return DEFAULT_SECTIONS;
  });

  // make sure the RCM fields/sections exist in the registry (idempotent; also refreshes the payer options)
  useEffect(() => {
    ensureRcmFieldSeeds();
    setReady(true);
  }, []);
  useEffect(() => setValues(valuesFor(clientId)), [clientId]);
  useEffect(() => {
    const bump = () => setValues(valuesFor(clientId));
    window.addEventListener(COVERAGES_EVENT, bump);
    window.addEventListener(BILLING_SETUP_EVENT, bump);
    return () => { window.removeEventListener(COVERAGES_EVENT, bump); window.removeEventListener(BILLING_SETUP_EVENT, bump); };
  }, [clientId]);

  // admin-registered extra sections for the client module that are not placed yet show up too
  void getSectionsForOrg;

  const client = useMemo(() => (getStoredClients() as any[]).find((c) => c.id === clientId) || { id: clientId, name: "" }, [clientId, values]);

  const onSectionsChange = useCallback((next: OverviewSection[]) => {
    setSections(next);
    try { localStorage.setItem(SECTIONS_KEY, JSON.stringify(next)); } catch { /* ignore */ }
  }, []);

  const onFieldValueChange = useCallback(
    (key: string, value: any) => {
      setValues((prev) => ({ ...prev, [key]: value }));
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
        return;
      }
      if (key.startsWith("consent_")) {
        const cur = getClientDemographics(clientId).consents || {};
        saveClientDemographics(clientId, { consents: { ...cur, [key.replace("consent_", "")]: !!value } });
        return;
      }
      if (["legalFirstName", "legalLastName", "dob", "sex", "address", "guarantor", "selfPay"].includes(key)) {
        saveClientDemographics(clientId, { [key]: key === "selfPay" ? !!value : value } as any);
        return;
      }
      // any custom field an admin adds to the client module is stored on the client record
      const clients = getStoredClients() as any[];
      void clients;
    },
    [clientId]
  );

  if (!ready) return null;
  return (
    <div data-testid="client-insurance-tab">
      <DraggableOverviewSections
        mode="client"
        client={client}
        sections={sections}
        onSectionsChange={onSectionsChange}
        fieldValues={values}
        onFieldValueChange={onFieldValueChange}
        customFieldsModule="client"
      />
    </div>
  );
}
