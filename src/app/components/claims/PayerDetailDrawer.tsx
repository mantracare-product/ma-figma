import React, { useState, useEffect } from "react";
import {
  X,
  Shield,
  Save,
  Trash2,
  AlertCircle,
  CheckCircle2,
  Clock,
  FileText,
  Phone,
  Info,
  Plus,
  Building2,
  Users,
} from "lucide-react";
import { Button } from "../ui/Button";
import { Switch } from "../ui/switch";
import { Tooltip } from "../ui/Tooltip";
import { toast } from "sonner";
import {
  type Payer,
  type EnrollmentStatus,
  type EnrollmentFunctionDetail,
  payersStore,
  getPayer,
} from "../../../lib/billingSetupStore";
import {
  type PriorAuthRule,
  priorAuthRulesStore,
} from "../../../lib/priorAuthRulesStore";
import { loadServices, type Service } from "../../../lib/servicesStore";
import { coveragesStore } from "../../../lib/coveragesStore";
import { getStoredClaims } from "../../../lib/claimsStore";
import { newId } from "../../../lib/refStore";
import {
  getStoredCredentialing,
  upsertCredentialingRecord,
  getRenderingProviders,
  getOrgCredentialing,
  getProviderCredentialing,
  type CredentialingRecord,
  type CredentialingStatus,
  type NetworkStatus,
} from "../../../lib/credentialingStore";
import { getOrgBilling } from "../../../lib/orgBilling";

export interface PayerDetailDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  payerId?: string | null;
  initialTab?: "general" | "enrollment" | "rules" | "credentialing";
}

const ENROLLMENT_OPTIONS: Array<{ value: EnrollmentStatus; label: string }> = [
  { value: "enrolled", label: "Enrolled" },
  { value: "pending", label: "Pending" },
  { value: "not_started", label: "Not started" },
  { value: "rejected", label: "Rejected" },
];

const PAYER_TYPES: Array<{ value: NonNullable<Payer["type"]>; label: string }> = [
  { value: "commercial", label: "Commercial" },
  { value: "medicare", label: "Medicare" },
  { value: "medicaid", label: "Medicaid" },
  { value: "other", label: "Other" },
];

export default function PayerDetailDrawer({
  isOpen,
  onClose,
  payerId,
  initialTab = "general",
}: PayerDetailDrawerProps) {
  const [activeTab, setActiveTab] = useState<"general" | "enrollment" | "rules" | "credentialing">(initialTab);
  const [services, setServices] = useState<Service[]>([]);

  // Payer state
  const [name, setName] = useState("");
  const [payerIdCode, setPayerIdCode] = useState("");
  const [type, setType] = useState<Payer["type"]>("commercial");
  const [phone, setPhone] = useState("");
  const [timelyFilingDays, setTimelyFilingDays] = useState<number | undefined>(90);
  const [active, setActive] = useState<boolean>(true);

  // 3-function enrollment state
  const [eligibilityStatus, setEligibilityStatus] = useState<EnrollmentStatus>("not_started");
  const [eligibilityNotes, setEligibilityNotes] = useState("");
  const [claimsStatus, setClaimsStatus] = useState<EnrollmentStatus>("not_started");
  const [claimsNotes, setClaimsNotes] = useState("");
  const [eraStatus, setEraStatus] = useState<EnrollmentStatus>("not_started");
  const [eraNotes, setEraNotes] = useState("");

  // Organization credentialing state
  const [orgCredStatus, setOrgCredStatus] = useState<CredentialingStatus>("not_started");
  const [orgNetworkStatus, setOrgNetworkStatus] = useState<NetworkStatus>("in_network");
  const [orgPayerAssignedId, setOrgPayerAssignedId] = useState("");
  const [orgBillingNpi, setOrgBillingNpi] = useState("");
  const [orgEffectiveDate, setOrgEffectiveDate] = useState("");
  const [orgExpiresDate, setOrgExpiresDate] = useState("");
  const [orgNotes, setOrgNotes] = useState("");

  // Rendering providers list & their credentialing records
  const [renderingProviders, setRenderingProviders] = useState(getRenderingProviders());
  const [providerCreds, setProviderCreds] = useState<Record<string, Partial<CredentialingRecord>>>({});

  // Prior auth rules for this payer (draft copy)
  const [rules, setRules] = useState<PriorAuthRule[]>([]);

  useEffect(() => {
    setActiveTab(initialTab);
  }, [initialTab, isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    setServices(loadServices());

    if (payerId) {
      const p = getPayer(payerId);
      if (p) {
        setName(p.name || "");
        setPayerIdCode(p.payerIdCode || "");
        setType(p.type || "commercial");
        setPhone(p.phone || "");
        setTimelyFilingDays(p.timelyFilingDays ?? 90);
        setActive(p.active !== false);

        const elig = p.enrollment?.eligibility?.status ?? p.enrollment?.status ?? "not_started";
        const clm = p.enrollment?.claims?.status ?? p.enrollment?.status ?? "not_started";
        const er = p.enrollment?.era?.status ?? p.enrollment?.status ?? "not_started";

        setEligibilityStatus(elig);
        setEligibilityNotes(p.enrollment?.eligibility?.notes || "");
        setClaimsStatus(clm);
        setClaimsNotes(p.enrollment?.claims?.notes || "");
        setEraStatus(er);
        setEraNotes(p.enrollment?.era?.notes || "");

        // Load rules for this payer
        const payerRules = priorAuthRulesStore.get().filter((r) => r.payerId === payerId);
        setRules(payerRules);

        // Load credentialing
        const orgCred = getOrgCredentialing(payerId);
        if (orgCred) {
          setOrgCredStatus(orgCred.status);
          setOrgNetworkStatus(orgCred.networkStatus);
          setOrgPayerAssignedId(orgCred.payerAssignedId || "");
          setOrgBillingNpi(orgCred.billingNpi || "");
          setOrgEffectiveDate(orgCred.effectiveDate || "");
          setOrgExpiresDate(orgCred.expiresDate || "");
          setOrgNotes(orgCred.notes || "");
        } else {
          setOrgCredStatus("not_started");
          setOrgNetworkStatus("in_network");
          setOrgPayerAssignedId("");
          setOrgBillingNpi("");
          setOrgEffectiveDate("");
          setOrgExpiresDate("");
          setOrgNotes("");
        }

        const renderers = getRenderingProviders();
        setRenderingProviders(renderers);
        const credMap: Record<string, Partial<CredentialingRecord>> = {};
        renderers.forEach((m) => {
          const pCred = getProviderCredentialing(m.id, payerId);
          credMap[String(m.id)] = pCred ? { ...pCred } : {
            scope: "provider",
            memberId: String(m.id),
            memberName: m.name,
            payerId,
            networkStatus: "in_network",
            status: "not_started",
          };
        });
        setProviderCreds(credMap);
        return;
      }
    }

    // New payer default
    setName("");
    setPayerIdCode("");
    setType("commercial");
    setPhone("");
    setTimelyFilingDays(90);
    setActive(true);
    setEligibilityStatus("not_started");
    setEligibilityNotes("");
    setClaimsStatus("not_started");
    setClaimsNotes("");
    setEraStatus("not_started");
    setEraNotes("");
    setOrgCredStatus("not_started");
    setOrgNetworkStatus("in_network");
    setOrgPayerAssignedId("");
    setOrgBillingNpi("");
    setOrgEffectiveDate("");
    setOrgExpiresDate("");
    setOrgNotes("");
    const renderers = getRenderingProviders();
    setRenderingProviders(renderers);
    setProviderCreds({});
    setRules([]);
  }, [isOpen, payerId]);

  if (!isOpen) return null;

  const servicesWithCpt = services.filter((s) => !!s.cptCode);

  const handleSave = () => {
    if (!name.trim()) {
      toast.error("Please enter a payer name");
      return;
    }
    const currentId = payerId || newId("payer");
    const existing = payerId ? getPayer(payerId) : undefined;

    const overallStatus: EnrollmentStatus =
      eligibilityStatus === "enrolled" && claimsStatus === "enrolled" && eraStatus === "enrolled"
        ? "enrolled"
        : eligibilityStatus === "rejected" || claimsStatus === "rejected" || eraStatus === "rejected"
        ? "rejected"
        : eligibilityStatus === "pending" || claimsStatus === "pending" || eraStatus === "pending"
        ? "pending"
        : "not_started";

    const updatedPayer: Payer = {
      id: currentId,
      name: name.trim(),
      payerIdCode: payerIdCode.trim(),
      type,
      phone: phone.trim() || undefined,
      timelyFilingDays: timelyFilingDays !== undefined ? Number(timelyFilingDays) : 90,
      active,
      sample: false,
      enrollment: {
        status: overallStatus,
        eligibility: {
          status: eligibilityStatus,
          notes: eligibilityNotes.trim() || undefined,
          enrolledAt: eligibilityStatus === "enrolled" ? existing?.enrollment?.eligibility?.enrolledAt || new Date().toISOString() : undefined,
        },
        claims: {
          status: claimsStatus,
          notes: claimsNotes.trim() || undefined,
          enrolledAt: claimsStatus === "enrolled" ? existing?.enrollment?.claims?.enrolledAt || new Date().toISOString() : undefined,
        },
        era: {
          status: eraStatus,
          notes: eraNotes.trim() || undefined,
          enrolledAt: eraStatus === "enrolled" ? existing?.enrollment?.era?.enrolledAt || new Date().toISOString() : undefined,
        },
      },
    };

    payersStore.upsert(updatedPayer);

    // Save rules for this payer: delete removed rules and save current
    const allStoredRules = priorAuthRulesStore.get();
    const otherPayerRules = allStoredRules.filter((r) => r.payerId !== currentId);
    const updatedPayerRules = rules.map((r) => ({
      ...r,
      payerId: currentId,
      sample: false,
    }));
    priorAuthRulesStore.save([...otherPayerRules, ...updatedPayerRules]);

    // Save organization credentialing
    upsertCredentialingRecord({
      scope: "organization",
      payerId: currentId,
      payerName: name.trim(),
      status: orgCredStatus,
      networkStatus: orgNetworkStatus,
      payerAssignedId: orgPayerAssignedId.trim() || undefined,
      billingNpi: orgBillingNpi.trim() || undefined,
      effectiveDate: orgEffectiveDate || undefined,
      expiresDate: orgExpiresDate || undefined,
      notes: orgNotes.trim() || undefined,
    });

    // Save rendering providers credentialing
    Object.values(providerCreds).forEach((pCred) => {
      if (pCred.memberId) {
        upsertCredentialingRecord({
          scope: "provider",
          memberId: pCred.memberId,
          memberName: pCred.memberName,
          payerId: currentId,
          payerName: name.trim(),
          status: pCred.status || "not_started",
          networkStatus: pCred.networkStatus || "in_network",
          payerAssignedId: pCred.payerAssignedId?.trim() || undefined,
          effectiveDate: pCred.effectiveDate || undefined,
          expiresDate: pCred.expiresDate || undefined,
          notes: pCred.notes?.trim() || undefined,
        });
      }
    });

    toast.success(`Payer "${updatedPayer.name}" saved successfully`);
    onClose();
  };

  const handleDelete = () => {
    if (!payerId) {
      onClose();
      return;
    }

    const currentPayer = getPayer(payerId);
    if (!currentPayer) {
      onClose();
      return;
    }

    // Check if payer is referenced in coverages, claims, or rules
    const hasCoverages = coveragesStore.get().some((c) => c.payerId === payerId);
    const hasClaims = getStoredClaims().some((c) => c.payer?.id === payerId || (c as any).payerId === payerId);
    const hasRules = priorAuthRulesStore.get().some((r) => r.payerId === payerId);

    if (hasCoverages || hasClaims || hasRules) {
      const reasons: string[] = [];
      if (hasCoverages) reasons.push("patient coverages");
      if (hasClaims) reasons.push("claims");
      if (hasRules) reasons.push("prior-auth rules");

      // Archive instead: set active = false
      payersStore.upsert({ ...currentPayer, active: false });
      toast.info(
        `Payer "${currentPayer.name}" is referenced by existing ${reasons.join(
          ", "
        )} and was archived (set to inactive) instead of deleted.`
      );
      onClose();
      return;
    }

    // Permanent delete
    payersStore.remove(payerId);
    toast.success(`Payer "${currentPayer.name}" deleted.`);
    onClose();
  };

  const handleAddRule = () => {
    const defaultSvc = servicesWithCpt[0];
    const newRule: PriorAuthRule = {
      id: newId("pa"),
      payerId: payerId || "draft",
      cptCode: defaultSvc?.cptCode || "",
      serviceId: defaultSvc?.id,
      required: true,
      units: 1,
      validityDays: 60,
      notes: "",
      sample: false,
    };
    setRules((prev) => [...prev, newRule]);
  };

  const handleRemoveRule = (ruleId: string) => {
    setRules((prev) => prev.filter((r) => r.id !== ruleId));
  };

  const handleUpdateRule = (ruleId: string, patch: Partial<PriorAuthRule>) => {
    setRules((prev) =>
      prev.map((r) => {
        if (r.id !== ruleId) return r;
        const updated = { ...r, ...patch };
        if (patch.cptCode) {
          const matchedService = servicesWithCpt.find((s) => s.cptCode === patch.cptCode);
          if (matchedService) {
            updated.serviceId = matchedService.id;
          }
        }
        return updated;
      })
    );
  };

  const enrolledCount = [eligibilityStatus, claimsStatus, eraStatus].filter((s) => s === "enrolled").length;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/40 backdrop-blur-xs z-50 transition-opacity animate-in fade-in"
        onClick={onClose}
      />

      {/* Slide-out Drawer */}
      <div
        className="fixed inset-y-0 right-0 z-50 w-full max-w-[850px] bg-[#fafafa] shadow-2xl flex flex-col border-l border-gray-200 animate-in slide-in-from-right duration-300"
        style={{ fontFamily: "Outfit, sans-serif" }}
        data-testid="payer-detail-drawer"
      >
        {/* Drawer Header */}
        <div className="bg-white px-6 py-4 border-b border-gray-200 flex items-center justify-between shrink-0 shadow-2xs">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-11 h-11 rounded-xl bg-gradient-to-tr from-[#1E293B] to-[#334155] text-white flex items-center justify-center font-bold text-sm shadow-xs shrink-0 border border-slate-200">
              <Shield className="w-5 h-5 text-white" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-[#111827] truncate leading-tight">
                  {name.trim() || "New Payer"}
                </h2>
                <span
                  className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider shrink-0 ${
                    active
                      ? "bg-emerald-50 text-emerald-700 border border-emerald-200/60"
                      : "bg-gray-100 text-gray-500 border border-gray-200"
                  }`}
                >
                  {active ? "Active" : "Inactive"}
                </span>
              </div>
              <p className="text-xs text-gray-500 truncate mt-0.5">
                Payer ID: {payerIdCode || "Not set"} · {PAYER_TYPES.find((t) => t.value === type)?.label || "Commercial"}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <Button
              variant="outline"
              size="sm"
              onClick={onClose}
              className="text-xs text-gray-600 hover:text-gray-900 cursor-pointer"
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={handleSave}
              className="bg-[#111827] hover:bg-[#1f2937] text-white text-xs font-semibold flex items-center gap-1.5 shadow-xs cursor-pointer"
            >
              <Save className="w-3.5 h-3.5" />
              Save Changes
            </Button>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors ml-1 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Tab Switcher */}
        <div className="bg-white px-6 border-b border-gray-200 flex items-center gap-6 shrink-0">
          <button
            type="button"
            onClick={() => setActiveTab("general")}
            className={`py-3 text-xs font-bold border-b-2 transition-all cursor-pointer ${
              activeTab === "general"
                ? "border-blue-600 text-blue-600"
                : "border-transparent text-gray-500 hover:text-gray-800"
            }`}
          >
            General
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("enrollment")}
            className={`py-3 text-xs font-bold border-b-2 transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === "enrollment"
                ? "border-blue-600 text-blue-600"
                : "border-transparent text-gray-500 hover:text-gray-800"
            }`}
          >
            Enrollment
            <span
              className={`px-1.5 py-0.2 rounded-full text-[10px] font-semibold ${
                enrolledCount === 3
                  ? "bg-emerald-50 text-emerald-700"
                  : enrolledCount > 0
                  ? "bg-blue-50 text-blue-700"
                  : "bg-slate-100 text-slate-500"
              }`}
            >
              {enrolledCount}/3
            </span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("rules")}
            className={`py-3 text-xs font-bold border-b-2 transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === "rules"
                ? "border-blue-600 text-blue-600"
                : "border-transparent text-gray-500 hover:text-gray-800"
            }`}
          >
            Prior-auth rules
            <span className="px-1.5 py-0.2 rounded-full text-[10px] font-semibold bg-slate-100 text-slate-600">
              {rules.length}
            </span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("credentialing")}
            className={`py-3 text-xs font-bold border-b-2 transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === "credentialing"
                ? "border-blue-600 text-blue-600"
                : "border-transparent text-gray-500 hover:text-gray-800"
            }`}
          >
            Credentialing
            <span className="px-1.5 py-0.2 rounded-full text-[10px] font-semibold bg-slate-100 text-slate-600">
              {renderingProviders.filter((m) => providerCreds[String(m.id)]?.status === "credentialed").length}/{renderingProviders.length}
            </span>
          </button>
        </div>

        {/* Drawer Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {activeTab === "general" && (
            <div className="space-y-5 max-w-2xl">
              <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-4 shadow-xs">
                <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">Payer Details</h3>
                
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Payer Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Blue Cross Blue Shield"
                    className="w-full h-9 px-3 bg-white border border-slate-200 rounded-lg text-xs font-medium text-slate-800 focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Payer ID (Electronic EDI Code)
                    </label>
                    <input
                      type="text"
                      value={payerIdCode}
                      onChange={(e) => setPayerIdCode(e.target.value)}
                      placeholder="e.g. 00060, BCBS1"
                      className="w-full h-9 px-3 bg-white border border-slate-200 rounded-lg text-xs font-medium text-slate-800 focus:outline-none focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Payer Type</label>
                    <select
                      value={type}
                      onChange={(e) => setType(e.target.value as Payer["type"])}
                      className="w-full h-9 px-3 bg-white border border-slate-200 rounded-lg text-xs font-medium text-slate-800 focus:outline-none focus:border-blue-500 cursor-pointer"
                    >
                      {PAYER_TYPES.map((t) => (
                        <option key={t.value} value={t.value}>
                          {t.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Payer Phone</label>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="e.g. 1-800-555-0100"
                    className="w-full h-9 px-3 bg-white border border-slate-200 rounded-lg text-xs font-medium text-slate-800 focus:outline-none focus:border-blue-500"
                  />
                  {!phone.trim() ? (
                    <p className="text-[11px] text-amber-600 flex items-center gap-1 mt-1 font-medium">
                      <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                      Add the payer phone to enable benefit calls
                    </p>
                  ) : (
                    <p className="text-[11px] text-slate-400 mt-1">Feeds automated phone calls for payer benefit inquiries.</p>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Timely Filing (days)
                  </label>
                  <input
                    type="number"
                    value={timelyFilingDays ?? ""}
                    onChange={(e) => setTimelyFilingDays(e.target.value === "" ? undefined : Number(e.target.value))}
                    placeholder="90"
                    className="w-full h-9 px-3 bg-white border border-slate-200 rounded-lg text-xs font-medium text-slate-800 focus:outline-none focus:border-blue-500"
                  />
                  <p className="text-[11px] text-slate-400 mt-1">
                    Overrides the global Claim defaults fallback value for claims billed to this payer.
                  </p>
                </div>

                <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                  <div>
                    <span className="text-xs font-bold text-slate-800">Active Status</span>
                    <p className="text-[11px] text-slate-500">
                      Inactive payers are hidden from patient coverage dropdowns but kept in records.
                    </p>
                  </div>
                  <Switch checked={active} onCheckedChange={setActive} />
                </div>
              </div>
            </div>
          )}

          {activeTab === "enrollment" && (
            <div className="space-y-4 max-w-2xl">
              <p className="text-xs text-slate-500">
                EDI transactions require separate provider enrollment with each payer function.
              </p>

              {/* Function 1: Eligibility */}
              <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-3 shadow-xs">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-xs font-bold text-slate-900">Eligibility (270 / 271)</h4>
                    <p className="text-[11px] text-slate-500">Real-time insurance coverage and benefits verification</p>
                  </div>
                  <select
                    value={eligibilityStatus}
                    onChange={(e) => setEligibilityStatus(e.target.value as EnrollmentStatus)}
                    className="h-8 px-2.5 rounded-lg border border-slate-200 bg-white text-xs font-semibold text-slate-700 focus:outline-none cursor-pointer"
                  >
                    {ENROLLMENT_OPTIONS.map((o) => (
                      <option key={o.value} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                </div>
                <input
                  type="text"
                  value={eligibilityNotes}
                  onChange={(e) => setEligibilityNotes(e.target.value)}
                  placeholder="Enrollment reference ID, portal account, or notes..."
                  className="w-full h-8 px-2.5 bg-slate-50/50 border border-slate-200 rounded-lg text-xs text-slate-700 focus:bg-white focus:outline-none focus:border-blue-500"
                />
              </div>

              {/* Function 2: Claims */}
              <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-3 shadow-xs">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-xs font-bold text-slate-900">Claims Submission (837P)</h4>
                    <p className="text-[11px] text-slate-500">Electronic professional claims transmission</p>
                  </div>
                  <select
                    value={claimsStatus}
                    onChange={(e) => setClaimsStatus(e.target.value as EnrollmentStatus)}
                    className="h-8 px-2.5 rounded-lg border border-slate-200 bg-white text-xs font-semibold text-slate-700 focus:outline-none cursor-pointer"
                  >
                    {ENROLLMENT_OPTIONS.map((o) => (
                      <option key={o.value} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                </div>
                <input
                  type="text"
                  value={claimsNotes}
                  onChange={(e) => setClaimsNotes(e.target.value)}
                  placeholder="Payer claim submitter ID or clearinghouse notes..."
                  className="w-full h-8 px-2.5 bg-slate-50/50 border border-slate-200 rounded-lg text-xs text-slate-700 focus:bg-white focus:outline-none focus:border-blue-500"
                />
              </div>

              {/* Function 3: ERA */}
              <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-3 shadow-xs">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-xs font-bold text-slate-900">Electronic Remittance Advice (835 ERA)</h4>
                    <p className="text-[11px] text-slate-500">Automated remittance advice and payment receipt</p>
                  </div>
                  <select
                    value={eraStatus}
                    onChange={(e) => setEraStatus(e.target.value as EnrollmentStatus)}
                    className="h-8 px-2.5 rounded-lg border border-slate-200 bg-white text-xs font-semibold text-slate-700 focus:outline-none cursor-pointer"
                  >
                    {ENROLLMENT_OPTIONS.map((o) => (
                      <option key={o.value} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                </div>
                <input
                  type="text"
                  value={eraNotes}
                  onChange={(e) => setEraNotes(e.target.value)}
                  placeholder="ERA enrollment tracking number or clearinghouse notes..."
                  className="w-full h-8 px-2.5 bg-slate-50/50 border border-slate-200 rounded-lg text-xs text-slate-700 focus:bg-white focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>
          )}

          {activeTab === "rules" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                    Prior-Authorization Requirements
                  </h4>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Configure service-specific authorization rules and approval validity windows for this payer.
                  </p>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleAddRule}
                  className="text-xs font-semibold flex items-center gap-1.5 cursor-pointer bg-white"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Add Rule
                </Button>
              </div>

              {rules.length === 0 ? (
                <div className="bg-white rounded-xl border border-dashed border-slate-200 p-8 text-center">
                  <FileText className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                  <p className="text-xs font-medium text-slate-600">No prior-auth rules configured for this payer</p>
                  <p className="text-[11px] text-slate-400 mt-1">
                    Services without a specific rule fall back to their per-service default authorization setting.
                  </p>
                </div>
              ) : (
                <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-[#1E293B] text-white text-[11px] font-semibold uppercase tracking-wider">
                      <tr>
                        <th className="px-3 py-2">Service</th>
                        <th className="px-3 py-2 w-24">Auth Required</th>
                        <th className="px-3 py-2 w-20">Units</th>
                        <th className="px-3 py-2 w-28">
                          <Tooltip text="Days valid from service date for this authorization">
                            <span className="cursor-help flex items-center gap-1">
                              Validity (Days) <Info className="w-3 h-3 text-slate-400" />
                            </span>
                          </Tooltip>
                        </th>
                        <th className="px-3 py-2">Notes</th>
                        <th className="px-2 py-2 w-10 text-center"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {rules.map((r) => {
                        const matchedService = servicesWithCpt.find((s) => s.cptCode === r.cptCode);
                        return (
                          <tr key={r.id} className="hover:bg-slate-50/60 transition-colors">
                            <td className="px-3 py-2">
                              {matchedService ? (
                                <select
                                  value={r.cptCode || ""}
                                  onChange={(e) => handleUpdateRule(r.id, { cptCode: e.target.value })}
                                  className="w-full h-8 px-2 bg-white border border-slate-200 rounded-md text-xs font-medium text-slate-800 focus:outline-none focus:border-blue-500 cursor-pointer"
                                >
                                  {servicesWithCpt.map((s) => (
                                    <option key={s.id} value={s.cptCode}>
                                      {s.cptCode} {s.name}
                                    </option>
                                  ))}
                                </select>
                              ) : (
                                <div className="space-y-0.5">
                                  <div className="font-semibold text-slate-700">{r.cptCode || "No CPT"}</div>
                                  <p className="text-[10px] text-amber-600">
                                    Matches no active service CPT (kept as read-only)
                                  </p>
                                </div>
                              )}
                            </td>
                            <td className="px-3 py-2">
                              <select
                                value={r.required ? "yes" : "no"}
                                onChange={(e) => handleUpdateRule(r.id, { required: e.target.value === "yes" })}
                                className="w-full h-8 px-2 bg-white border border-slate-200 rounded-md text-xs font-medium text-slate-800 focus:outline-none focus:border-blue-500 cursor-pointer"
                              >
                                <option value="yes">Yes</option>
                                <option value="no">No</option>
                              </select>
                            </td>
                            <td className="px-3 py-2">
                              <input
                                type="number"
                                min={1}
                                value={r.units ?? ""}
                                onChange={(e) =>
                                  handleUpdateRule(r.id, {
                                    units: e.target.value === "" ? undefined : Number(e.target.value),
                                  })
                                }
                                placeholder="1"
                                className="w-full h-8 px-2 bg-white border border-slate-200 rounded-md text-xs font-medium text-slate-800 focus:outline-none focus:border-blue-500"
                              />
                            </td>
                            <td className="px-3 py-2">
                              <input
                                type="number"
                                min={1}
                                value={r.validityDays ?? ""}
                                onChange={(e) =>
                                  handleUpdateRule(r.id, {
                                    validityDays: e.target.value === "" ? undefined : Number(e.target.value),
                                  })
                                }
                                placeholder="60"
                                className="w-full h-8 px-2 bg-white border border-slate-200 rounded-md text-xs font-medium text-slate-800 focus:outline-none focus:border-blue-500"
                              />
                            </td>
                            <td className="px-3 py-2">
                              <input
                                type="text"
                                value={r.notes || ""}
                                onChange={(e) => handleUpdateRule(r.id, { notes: e.target.value })}
                                placeholder="e.g. Needs state clinical form"
                                className="w-full h-8 px-2 bg-white border border-slate-200 rounded-md text-xs font-medium text-slate-800 focus:outline-none focus:border-blue-500"
                              />
                            </td>
                            <td className="px-2 py-2 text-center">
                              <button
                                type="button"
                                onClick={() => handleRemoveRule(r.id)}
                                className="p-1 rounded text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
                                title="Remove rule"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {activeTab === "credentialing" && (
            <div className="space-y-6 max-w-4xl">
              {/* Organization Credentialing Card */}
              <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-4 shadow-xs">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                  <div className="flex items-center gap-2">
                    <Building2 className="w-4 h-4 text-blue-600" />
                    <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                      Organization Credentialing
                    </h3>
                  </div>
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                      orgCredStatus === "credentialed"
                        ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                        : orgCredStatus === "denied" || orgCredStatus === "expired"
                        ? "bg-rose-50 text-rose-700 border border-rose-200"
                        : "bg-slate-100 text-slate-600"
                    }`}
                  >
                    {orgCredStatus.replace("_", " ")}
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Credentialing Status
                    </label>
                    <select
                      value={orgCredStatus}
                      onChange={(e) => setOrgCredStatus(e.target.value as CredentialingStatus)}
                      className="w-full h-9 px-3 bg-white border border-slate-200 rounded-lg text-xs font-medium text-slate-800 focus:outline-none focus:border-blue-500 cursor-pointer"
                    >
                      <option value="not_started">Not Started</option>
                      <option value="submitted">Submitted</option>
                      <option value="in_review">In Review</option>
                      <option value="credentialed">Credentialed</option>
                      <option value="denied">Denied</option>
                      <option value="expired">Expired</option>
                      <option value="terminated">Terminated</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Network Status
                    </label>
                    <select
                      value={orgNetworkStatus}
                      onChange={(e) => setOrgNetworkStatus(e.target.value as NetworkStatus)}
                      className="w-full h-9 px-3 bg-white border border-slate-200 rounded-lg text-xs font-medium text-slate-800 focus:outline-none focus:border-blue-500 cursor-pointer"
                    >
                      <option value="in_network">In Network</option>
                      <option value="out_of_network">Out of Network</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Payer-Assigned ID
                    </label>
                    <input
                      type="text"
                      value={orgPayerAssignedId}
                      onChange={(e) => setOrgPayerAssignedId(e.target.value)}
                      placeholder="e.g. BCBS-GRP-9821"
                      className="w-full h-9 px-3 bg-white border border-slate-200 rounded-lg text-xs font-medium text-slate-800 focus:outline-none focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Billing NPI Override
                    </label>
                    <input
                      type="text"
                      value={orgBillingNpi}
                      onChange={(e) => setOrgBillingNpi(e.target.value)}
                      placeholder="Defaults to org Group NPI"
                      className="w-full h-9 px-3 bg-white border border-slate-200 rounded-lg text-xs font-medium text-slate-800 focus:outline-none focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Effective Date
                    </label>
                    <input
                      type="date"
                      value={orgEffectiveDate}
                      onChange={(e) => setOrgEffectiveDate(e.target.value)}
                      className="w-full h-9 px-3 bg-white border border-slate-200 rounded-lg text-xs font-medium text-slate-800 focus:outline-none focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Expiration Date
                    </label>
                    <input
                      type="date"
                      value={orgExpiresDate}
                      onChange={(e) => setOrgExpiresDate(e.target.value)}
                      className="w-full h-9 px-3 bg-white border border-slate-200 rounded-lg text-xs font-medium text-slate-800 focus:outline-none focus:border-blue-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Notes
                  </label>
                  <input
                    type="text"
                    value={orgNotes}
                    onChange={(e) => setOrgNotes(e.target.value)}
                    placeholder="Credentialing notes, tracking numbers, contact person..."
                    className="w-full h-9 px-3 bg-white border border-slate-200 rounded-lg text-xs font-medium text-slate-800 focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              {/* Rendering Providers Credentialing Table */}
              <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-4 shadow-xs">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                  <div className="flex items-center gap-2">
                    <Users className="w-4 h-4 text-blue-600" />
                    <div>
                      <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                        Rendering Providers
                      </h3>
                      <p className="text-[11px] text-slate-500">
                        Staff members configured as rendering providers or with billing NPIs
                      </p>
                    </div>
                  </div>
                  <span className="text-xs text-slate-500 font-medium">
                    {renderingProviders.length} providers
                  </span>
                </div>

                {renderingProviders.length === 0 ? (
                  <div className="py-6 text-center text-xs text-slate-400">
                    No rendering providers configured. Add an NPI or enable service rendering in Team settings.
                  </div>
                ) : (
                  <div className="overflow-x-auto border border-slate-200 rounded-lg">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-50 border-b border-slate-200 text-[10px] font-bold text-slate-600 uppercase">
                        <tr>
                          <th className="px-3 py-2">Provider</th>
                          <th className="px-3 py-2">NPI</th>
                          <th className="px-3 py-2">Network Status</th>
                          <th className="px-3 py-2">Status</th>
                          <th className="px-3 py-2">Payer-Assigned ID</th>
                          <th className="px-3 py-2">Effective</th>
                          <th className="px-3 py-2">Expires</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 font-medium text-slate-800">
                        {renderingProviders.map((m) => {
                          const mId = String(m.id);
                          const cred = providerCreds[mId] || {
                            scope: "provider",
                            memberId: mId,
                            memberName: m.name,
                            payerId: payerId || "",
                            networkStatus: "in_network",
                            status: "not_started",
                          };

                          const updateField = (patch: Partial<CredentialingRecord>) => {
                            setProviderCreds((prev) => ({
                              ...prev,
                              [mId]: { ...prev[mId], ...patch, memberId: mId, memberName: m.name },
                            }));
                            if (payerId) {
                              upsertCredentialingRecord({
                                scope: "provider",
                                memberId: mId,
                                memberName: m.name,
                                payerId,
                                payerName: name.trim(),
                                ...(providerCreds[mId] || {}),
                                ...patch,
                              });
                            }
                          };

                          return (
                            <tr key={mId} className="hover:bg-slate-50/70 transition-colors">
                              <td className="px-3 py-2">
                                <span className="font-semibold text-slate-900">{m.name}</span>
                              </td>
                              <td className="px-3 py-2 font-mono text-slate-600">
                                {m.npi || "—"}
                              </td>
                              <td className="px-3 py-2">
                                <select
                                  value={cred.networkStatus || "in_network"}
                                  onChange={(e) => updateField({ networkStatus: e.target.value as NetworkStatus })}
                                  className="h-7 px-2 bg-white border border-slate-200 rounded text-xs outline-none cursor-pointer"
                                >
                                  <option value="in_network">In Network</option>
                                  <option value="out_of_network">Out of Network</option>
                                </select>
                              </td>
                              <td className="px-3 py-2">
                                <select
                                  value={cred.status || "not_started"}
                                  onChange={(e) => updateField({ status: e.target.value as CredentialingStatus })}
                                  className="h-7 px-2 bg-white border border-slate-200 rounded text-xs outline-none cursor-pointer font-medium"
                                >
                                  <option value="not_started">Not Started</option>
                                  <option value="submitted">Submitted</option>
                                  <option value="in_review">In Review</option>
                                  <option value="credentialed">Credentialed</option>
                                  <option value="denied">Denied</option>
                                  <option value="expired">Expired</option>
                                  <option value="terminated">Terminated</option>
                                </select>
                              </td>
                              <td className="px-3 py-2">
                                <input
                                  type="text"
                                  value={cred.payerAssignedId || ""}
                                  onChange={(e) => updateField({ payerAssignedId: e.target.value })}
                                  placeholder="e.g. PR-0042"
                                  className="h-7 px-2 w-28 bg-white border border-slate-200 rounded text-xs outline-none"
                                />
                              </td>
                              <td className="px-3 py-2">
                                <input
                                  type="date"
                                  value={cred.effectiveDate || ""}
                                  onChange={(e) => updateField({ effectiveDate: e.target.value })}
                                  className="h-7 px-1.5 bg-white border border-slate-200 rounded text-[11px] outline-none"
                                />
                              </td>
                              <td className="px-3 py-2">
                                <input
                                  type="date"
                                  value={cred.expiresDate || ""}
                                  onChange={(e) => updateField({ expiresDate: e.target.value })}
                                  className="h-7 px-1.5 bg-white border border-slate-200 rounded text-[11px] outline-none"
                                />
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Drawer Footer */}
        <div className="bg-white px-6 py-4 border-t border-gray-200 flex items-center justify-between shrink-0 shadow-2xs">
          <div>
            {payerId && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleDelete}
                className="text-red-600 border-red-200 hover:bg-red-50 text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Delete Payer
              </Button>
            )}
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={onClose}
              className="text-xs text-gray-600 hover:text-gray-900 cursor-pointer"
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={handleSave}
              className="bg-[#111827] hover:bg-[#1f2937] text-white text-xs font-semibold flex items-center gap-1.5 shadow-xs cursor-pointer"
            >
              <Save className="w-3.5 h-3.5" />
              Save Changes
            </Button>
          </div>
        </div>
      </div>
    </>
  );
}
