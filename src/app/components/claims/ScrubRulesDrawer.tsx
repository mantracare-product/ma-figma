import React, { useState, useEffect } from "react";
import {
  X,
  ShieldCheck,
  Plus,
  Trash2,
  Edit2,
  ArrowLeft,
  AlertCircle,
  AlertTriangle,
  Layers,
  Save,
  Check,
} from "lucide-react";
import { Button } from "../ui/Button";
import { Switch } from "../ui/switch";
import { toast } from "sonner";
import { useCurrentPermissions } from "../../hooks/useCurrentPermissions";
import { useFieldRegistry } from "../../context/FieldRegistryContext";
import {
  scrubRulesStore,
  type ScrubRule,
  type ScrubCondition,
  type ScrubConditionGroup,
  type ScrubRecordScope,
  type ScrubOperator,
  type ScrubLineQuantifier,
  type ScrubSeverity,
} from "../../../lib/billingSetupStore";
import { convertLegacyRuleToBlock } from "../../../lib/scrubMigration";

export interface ScrubRulesDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

const RECORD_OPTIONS: Array<{ value: ScrubRecordScope; label: string }> = [
  { value: "claim", label: "Claim" },
  { value: "claim_line", label: "Claim line" },
  { value: "patient", label: "Patient" },
  { value: "coverage", label: "Coverage" },
  { value: "payer", label: "Payer" },
  { value: "rendering_provider", label: "Rendering provider" },
  { value: "appointment", label: "Appointment" },
  { value: "authorization", label: "Authorization" },
  { value: "organization", label: "Organization" },
];

const OPERATOR_OPTIONS: Array<{ value: ScrubOperator; label: string }> = [
  { value: "is_empty", label: "is empty" },
  { value: "is_not_empty", label: "is not empty" },
  { value: "is", label: "is" },
  { value: "is_not", label: "is not" },
  { value: "is_one_of", label: "is one of" },
  { value: "greater_than", label: "greater than" },
  { value: "less_than", label: "less than" },
  { value: "contains", label: "contains" },
];

const STANDARD_FIELDS_BY_RECORD: Record<
  ScrubRecordScope,
  Array<{ key: string; label: string; fixedOptions?: string[] }>
> = {
  claim: [
    { key: "diagnosisCodes", label: "Diagnosis codes (ICD-10)" },
    { key: "totalCharge", label: "Total charge" },
    { key: "serviceDate", label: "Date of service" },
    { key: "placeOfService", label: "Place of service" },
    { key: "acceptAssignment", label: "Accept assignment", fixedOptions: ["true", "false"] },
    { key: "signatureOnFile", label: "Signature on file", fixedOptions: ["true", "false"] },
    { key: "releaseOfInformation", label: "Release of info", fixedOptions: ["true", "false"] },
    { key: "timelyFilingDeadline", label: "Timely filing deadline" },
    { key: "_isDuplicateClaim", label: "Duplicate claim (derived)", fixedOptions: ["true", "false"] },
    { key: "_isFutureDos", label: "Date of service in future (derived)", fixedOptions: ["true", "false"] },
    { key: "_daysPastFiling", label: "Days past filing deadline (derived)" },
    { key: "claimNumber", label: "Claim number" },
  ],
  claim_line: [
    { key: "cptCode", label: "Service / CPT code" },
    { key: "modifier", label: "Modifier (e.g. RT, LT, 25)" },
    { key: "units", label: "Units" },
    { key: "chargeAmount", label: "Charge amount" },
    { key: "description", label: "Line description" },
  ],
  patient: [
    { key: "name", label: "Patient name" },
    { key: "dob", label: "Date of birth" },
    { key: "gender", label: "Gender", fixedOptions: ["Male", "Female", "Other"] },
    { key: "phone", label: "Phone number" },
    { key: "email", label: "Email" },
    { key: "address", label: "Address" },
  ],
  coverage: [
    { key: "memberId", label: "Member ID / Insured ID" },
    { key: "groupNumber", label: "Group number" },
    { key: "priority", label: "Priority", fixedOptions: ["primary", "secondary", "tertiary"] },
    { key: "copay", label: "Copay amount" },
    { key: "deductibleRemaining", label: "Deductible remaining" },
  ],
  payer: [
    { key: "name", label: "Payer name" },
    { key: "payerIdCode", label: "Payer ID code" },
    { key: "type", label: "Payer type", fixedOptions: ["commercial", "medicare", "medicaid", "other"] },
    { key: "phone", label: "Payer phone" },
    { key: "timelyFilingDays", label: "Timely filing days" },
  ],
  rendering_provider: [
    { key: "name", label: "Provider name" },
    { key: "npi", label: "Provider NPI" },
    { key: "_npiValid", label: "NPI is valid (10-digit Luhn)", fixedOptions: ["true", "false"] },
    { key: "taxonomy", label: "Taxonomy code" },
    { key: "licenseNumber", label: "License number" },
    { key: "licenseState", label: "License state" },
  ],
  appointment: [
    { key: "serviceName", label: "Service name" },
    { key: "serviceDate", label: "Appointment date" },
    { key: "paymentMode", label: "Payment mode", fixedOptions: ["insurance", "self_pay"] },
    { key: "locationName", label: "Location name" },
  ],
  authorization: [
    { key: "authorizationNumber", label: "Authorization number" },
    { key: "status", label: "Auth status", fixedOptions: ["required", "not_required", "approved", "denied", "pending"] },
    { key: "units", label: "Approved units" },
    { key: "validUntil", label: "Valid until date" },
  ],
  organization: [
    { key: "legalName", label: "Legal business name" },
    { key: "ein", label: "Tax ID (EIN)" },
    { key: "groupNpi", label: "Group / Billing NPI" },
    { key: "_groupNpiValid", label: "Group NPI is valid (10-digit Luhn)", fixedOptions: ["true", "false"] },
    { key: "phone", label: "Billing phone" },
  ],
};

export default function ScrubRulesDrawer({ isOpen, onClose }: ScrubRulesDrawerProps) {
  const { hasPermission } = useCurrentPermissions();
  const canEdit = hasPermission("billingSetup", "edit");
  const { getAllFields } = useFieldRegistry();

  const [rules, setRules] = useState<ScrubRule[]>([]);
  const [editingRule, setEditingRule] = useState<ScrubRule | null>(null);

  const loadRules = () => {
    const raw = scrubRulesStore.get();
    const converted = raw.map(convertLegacyRuleToBlock);
    setRules(converted);
  };

  useEffect(() => {
    if (isOpen) {
      loadRules();
      setEditingRule(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  // Toggle on/off from list
  const handleToggleRule = (ruleId: string, currentEnabled: boolean) => {
    if (!canEdit) {
      toast.error("You don't have permission to edit scrub rules");
      return;
    }
    const updated = rules.map((r) =>
      r.id === ruleId ? { ...r, enabled: !currentEnabled } : r
    );
    setRules(updated);
    scrubRulesStore.save(updated);
    toast.success(`Rule "${rules.find((r) => r.id === ruleId)?.name}" ${!currentEnabled ? "enabled" : "disabled"}`);
  };

  // Remove rule from list
  const handleRemoveRule = (ruleId: string) => {
    if (!canEdit) {
      toast.error("You don't have permission to remove scrub rules");
      return;
    }
    const target = rules.find((r) => r.id === ruleId);
    scrubRulesStore.remove(ruleId);
    setRules((prev) => prev.filter((r) => r.id !== ruleId));
    toast.success(`Rule "${target?.name || ruleId}" removed`);
  };

  // Start creating new rule
  const handleCreateNew = () => {
    if (!canEdit) {
      toast.error("You don't have permission to create scrub rules");
      return;
    }
    const newRule: ScrubRule = {
      id: `scrub-${Date.now()}`,
      name: "New scrub rule",
      enabled: true,
      severity: "error",
      message: "Scrub validation failed",
      matchType: "ALL",
      groups: [
        {
          id: `g-${Date.now()}-1`,
          matchType: "ALL",
          conditions: [
            {
              id: `c-${Date.now()}-1`,
              record: "claim",
              field: "diagnosisCodes",
              operator: "is_empty",
              value: "",
            },
          ],
        },
      ],
    };
    setEditingRule(newRule);
  };

  // Save rule from editor
  const handleSaveEditingRule = () => {
    if (!editingRule) return;
    if (!canEdit) {
      toast.error("You don't have permission to edit scrub rules");
      return;
    }
    if (!editingRule.name.trim()) {
      toast.error("Rule name is required");
      return;
    }

    const updated = rules.some((r) => r.id === editingRule.id)
      ? rules.map((r) => (r.id === editingRule.id ? editingRule : r))
      : [...rules, editingRule];

    setRules(updated);
    scrubRulesStore.save(updated);
    toast.success(`Scrub rule "${editingRule.name}" saved successfully`);
    setEditingRule(null);
  };

  // Dynamic field list for record scope (standard + custom registry fields)
  const getFieldOptionsForRecord = (record: ScrubRecordScope) => {
    const std = STANDARD_FIELDS_BY_RECORD[record] || [];
    let customModule: any = null;
    if (record === "claim") customModule = "claim";
    else if (record === "patient") customModule = "client";
    else if (record === "appointment") customModule = "appointment";
    else if (record === "organization") customModule = "organization";
    else if (record === "rendering_provider") customModule = "teamMember";

    const custom: Array<{ key: string; label: string; fixedOptions?: string[] }> = [];
    if (customModule) {
      try {
        const regFields = getAllFields(customModule);
        for (const f of regFields) {
          if (!std.some((s) => s.key === f.key)) {
            custom.push({ key: f.key, label: f.label || f.key });
          }
        }
      } catch { /* ignore */ }
    }
    return [...std, ...custom];
  };

  // Condition group updates
  const updateGroup = (groupIndex: number, patch: Partial<ScrubConditionGroup>) => {
    if (!editingRule) return;
    const groups = [...(editingRule.groups || [])];
    groups[groupIndex] = { ...groups[groupIndex], ...patch };
    setEditingRule({ ...editingRule, groups });
  };

  const addConditionToGroup = (groupIndex: number) => {
    if (!editingRule) return;
    const groups = [...(editingRule.groups || [])];
    const grp = groups[groupIndex];
    const newCond: ScrubCondition = {
      id: `c-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      record: "claim",
      field: "diagnosisCodes",
      operator: "is_empty",
      value: "",
    };
    groups[groupIndex] = {
      ...grp,
      conditions: [...grp.conditions, newCond],
    };
    setEditingRule({ ...editingRule, groups });
  };

  const updateConditionInGroup = (
    groupIndex: number,
    condIndex: number,
    patch: Partial<ScrubCondition>
  ) => {
    if (!editingRule) return;
    const groups = [...(editingRule.groups || [])];
    const grp = groups[groupIndex];
    const conds = [...grp.conditions];
    const updatedCond = { ...conds[condIndex], ...patch };

    // Reset field and value if record changed
    if (patch.record && patch.record !== conds[condIndex].record) {
      const opts = getFieldOptionsForRecord(patch.record);
      updatedCond.field = opts[0]?.key || "";
      updatedCond.operator = "is_empty";
      updatedCond.value = "";
      if (patch.record === "claim_line") {
        updatedCond.lineQuantifier = "any";
      } else {
        delete updatedCond.lineQuantifier;
      }
    }

    conds[condIndex] = updatedCond;
    groups[groupIndex] = { ...grp, conditions: conds };
    setEditingRule({ ...editingRule, groups });
  };

  const removeConditionFromGroup = (groupIndex: number, condIndex: number) => {
    if (!editingRule) return;
    const groups = [...(editingRule.groups || [])];
    const grp = groups[groupIndex];
    const conds = grp.conditions.filter((_, idx) => idx !== condIndex);
    groups[groupIndex] = { ...grp, conditions: conds };
    setEditingRule({ ...editingRule, groups });
  };

  const addGroup = () => {
    if (!editingRule) return;
    const newGroup: ScrubConditionGroup = {
      id: `g-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      matchType: "ALL",
      conditions: [
        {
          id: `c-${Date.now()}`,
          record: "claim",
          field: "diagnosisCodes",
          operator: "is_empty",
          value: "",
        },
      ],
    };
    setEditingRule({
      ...editingRule,
      groups: [...(editingRule.groups || []), newGroup],
    });
  };

  const removeGroup = (groupIndex: number) => {
    if (!editingRule) return;
    const groups = (editingRule.groups || []).filter((_, idx) => idx !== groupIndex);
    setEditingRule({ ...editingRule, groups });
  };

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/40 backdrop-blur-xs z-50 transition-opacity animate-in fade-in"
        onClick={onClose}
      />

      {/* Slide-out Drawer */}
      <div
        className="fixed inset-y-0 right-0 z-50 w-full max-w-[680px] bg-[#fafafa] shadow-2xl flex flex-col border-l border-gray-200 animate-in slide-in-from-right duration-300"
        style={{ fontFamily: "Outfit, sans-serif" }}
        data-testid="scrub-rules-drawer"
      >
        {/* Header */}
        <div className="bg-white px-6 py-4 border-b border-gray-200 flex items-center justify-between shrink-0 shadow-2xs">
          <div className="flex items-center gap-3 min-w-0">
            {editingRule ? (
              <button
                type="button"
                onClick={() => setEditingRule(null)}
                className="w-8 h-8 rounded-lg border border-gray-200 flex items-center justify-center text-gray-500 hover:text-gray-900 hover:bg-gray-100 transition-colors cursor-pointer"
                title="Back to rules list"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>
            ) : (
              <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold text-sm shadow-xs shrink-0 border border-indigo-100">
                <ShieldCheck className="w-5 h-5 text-indigo-600" />
              </div>
            )}
            <div>
              <h2 className="text-base font-bold text-[#111827] leading-tight">
                {editingRule ? (editingRule.name || "Edit Scrub Rule") : "Scrub Rules"}
              </h2>
              <p className="text-xs text-gray-500 mt-0.5">
                {editingRule
                  ? "Define condition blocks (WHEN) and severity action (THEN)"
                  : `Automated claim validation. Error blocks submission; Warning flags issues.${!canEdit ? " (read-only)" : ""}`}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {!editingRule && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleCreateNew}
                disabled={!canEdit}
                className="h-8 text-xs font-semibold border-gray-300 hover:bg-gray-100 flex items-center gap-1.5"
              >
                <Plus className="w-3.5 h-3.5 text-gray-600" />
                Add rule
              </Button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5">
          {!editingRule ? (
            /* ================= RULES LIST VIEW ================= */
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs font-semibold text-gray-500 uppercase tracking-wider px-1">
                <span>Rule Name & Condition</span>
                <span>Severity & Status</span>
              </div>

              {rules.length === 0 ? (
                <div className="text-center py-12 bg-white rounded-2xl border border-dashed border-gray-300 p-6">
                  <ShieldCheck className="w-10 h-10 text-gray-300 mx-auto mb-2" />
                  <p className="text-sm font-semibold text-gray-700">No scrub rules defined</p>
                  <p className="text-xs text-gray-400 mt-1">
                    Add rules to validate claims before transmission.
                  </p>
                </div>
              ) : (
                rules.map((rule) => {
                  const condCount = (rule.groups || []).reduce(
                    (acc, g) => acc + (g.conditions || []).length,
                    0
                  );
                  return (
                    <div
                      key={rule.id}
                      className="bg-white rounded-xl border border-gray-200 p-3.5 shadow-2xs hover:border-gray-300 transition-all flex items-center justify-between gap-4"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-sm text-[#111827] truncate">
                            {rule.name}
                          </span>
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border uppercase tracking-wider ${
                              rule.severity === "error"
                                ? "bg-red-50 text-red-700 border-red-200"
                                : "bg-amber-50 text-amber-700 border-amber-200"
                            }`}
                          >
                            {rule.severity}
                          </span>
                        </div>
                        <p className="text-xs text-gray-500 mt-1 line-clamp-1">
                          {rule.message || "Scrub issue detected"}
                        </p>
                        <p className="text-[11px] text-gray-400 mt-0.5">
                          {condCount > 0
                            ? `${condCount} condition${condCount > 1 ? "s" : ""} in ${(rule.groups || []).length} group(s)`
                            : rule.check
                            ? `Legacy check: ${rule.check}`
                            : "No conditions"}
                        </p>
                      </div>

                      <div className="flex items-center gap-3 shrink-0">
                        <div className="flex items-center gap-1.5">
                          <Switch
                            checked={rule.enabled}
                            onCheckedChange={() => handleToggleRule(rule.id, rule.enabled)}
                            disabled={!canEdit}
                          />
                          <span className="text-xs font-medium text-gray-600">
                            {rule.enabled ? "On" : "Off"}
                          </span>
                        </div>

                        <button
                          type="button"
                          onClick={() => setEditingRule(rule)}
                          disabled={!canEdit}
                          className="p-1.5 rounded-lg text-gray-500 hover:text-blue-600 hover:bg-blue-50 transition-colors disabled:opacity-40 cursor-pointer"
                          title="Edit rule"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>

                        <button
                          type="button"
                          onClick={() => handleRemoveRule(rule.id)}
                          disabled={!canEdit}
                          className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors disabled:opacity-40 cursor-pointer"
                          title="Remove rule"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          ) : (
            /* ================= RULE EDITOR VIEW ================= */
            <div className="space-y-5">
              {/* Rule Name & Active switch */}
              <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-2xs space-y-4">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex-1">
                    <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
                      Rule Name *
                    </label>
                    <input
                      type="text"
                      value={editingRule.name}
                      onChange={(e) => setEditingRule({ ...editingRule, name: e.target.value })}
                      disabled={!canEdit}
                      placeholder="e.g. Laterality modifier required on surgery"
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                    />
                  </div>

                  <div className="flex items-center gap-2 pt-5">
                    <Switch
                      checked={editingRule.enabled}
                      onCheckedChange={(val) => setEditingRule({ ...editingRule, enabled: val })}
                      disabled={!canEdit}
                    />
                    <span className="text-xs font-semibold text-gray-700">
                      {editingRule.enabled ? "Active" : "Inactive"}
                    </span>
                  </div>
                </div>
              </div>

              {/* WHEN Block */}
              <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-2xs space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 font-bold text-xs uppercase border border-blue-200">
                      WHEN
                    </span>
                    <span className="text-xs font-semibold text-gray-700">
                      Claim triggers this rule if conditions match:
                    </span>
                  </div>

                  {(editingRule.groups || []).length > 1 && (
                    <div className="flex items-center bg-gray-100 rounded-lg p-0.5 text-xs font-semibold">
                      <button
                        type="button"
                        onClick={() => setEditingRule({ ...editingRule, matchType: "ALL" })}
                        className={`px-2.5 py-1 rounded-md transition-all ${
                          editingRule.matchType !== "ANY"
                            ? "bg-white text-blue-700 shadow-2xs"
                            : "text-gray-600 hover:text-gray-900"
                        }`}
                      >
                        ALL Groups
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditingRule({ ...editingRule, matchType: "ANY" })}
                        className={`px-2.5 py-1 rounded-md transition-all ${
                          editingRule.matchType === "ANY"
                            ? "bg-white text-blue-700 shadow-2xs"
                            : "text-gray-600 hover:text-gray-900"
                        }`}
                      >
                        ANY Group
                      </button>
                    </div>
                  )}
                </div>

                {/* Groups */}
                <div className="space-y-4">
                  {(editingRule.groups || []).map((grp, gIdx) => (
                    <div
                      key={grp.id}
                      className="border border-slate-200 rounded-xl p-3.5 bg-slate-50/60 space-y-3"
                    >
                      <div className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-slate-700">
                            Group {gIdx + 1}
                          </span>
                          {grp.conditions.length > 1 && (
                            <div className="flex items-center bg-white border border-gray-200 rounded-lg p-0.5">
                              <button
                                type="button"
                                onClick={() => updateGroup(gIdx, { matchType: "ALL" })}
                                className={`px-2 py-0.5 rounded text-[11px] font-semibold ${
                                  grp.matchType !== "ANY"
                                    ? "bg-blue-50 text-blue-700"
                                    : "text-gray-500 hover:text-gray-800"
                                }`}
                              >
                                ALL conditions (AND)
                              </button>
                              <button
                                type="button"
                                onClick={() => updateGroup(gIdx, { matchType: "ANY" })}
                                className={`px-2 py-0.5 rounded text-[11px] font-semibold ${
                                  grp.matchType === "ANY"
                                    ? "bg-blue-50 text-blue-700"
                                    : "text-gray-500 hover:text-gray-800"
                                }`}
                              >
                                ANY condition (OR)
                              </button>
                            </div>
                          )}
                        </div>

                        {(editingRule.groups || []).length > 1 && (
                          <button
                            type="button"
                            onClick={() => removeGroup(gIdx)}
                            disabled={!canEdit}
                            className="text-gray-400 hover:text-red-600 transition-colors"
                            title="Remove group"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>

                      {/* Condition rows */}
                      <div className="space-y-2">
                        {grp.conditions.map((cond, cIdx) => {
                          const fieldOpts = getFieldOptionsForRecord(cond.record);
                          const activeField = fieldOpts.find((f) => f.key === cond.field);
                          const hideValue =
                            cond.operator === "is_empty" || cond.operator === "is_not_empty";

                          return (
                            <div
                              key={cond.id}
                              className="bg-white rounded-lg border border-gray-200 p-2.5 flex flex-wrap items-center gap-2 text-xs shadow-2xs"
                            >
                              {/* Record scope */}
                              <div className="w-[125px] shrink-0">
                                <select
                                  value={cond.record}
                                  onChange={(e) =>
                                    updateConditionInGroup(gIdx, cIdx, {
                                      record: e.target.value as ScrubRecordScope,
                                    })
                                  }
                                  disabled={!canEdit}
                                  className="w-full px-2 py-1.5 border border-gray-300 rounded bg-white text-xs font-medium"
                                >
                                  {RECORD_OPTIONS.map((opt) => (
                                    <option key={opt.value} value={opt.value}>
                                      {opt.label}
                                    </option>
                                  ))}
                                </select>
                              </div>

                              {/* Claim line quantifier */}
                              {cond.record === "claim_line" && (
                                <div className="w-[95px] shrink-0">
                                  <select
                                    value={cond.lineQuantifier || "any"}
                                    onChange={(e) =>
                                      updateConditionInGroup(gIdx, cIdx, {
                                        lineQuantifier: e.target.value as ScrubLineQuantifier,
                                      })
                                    }
                                    disabled={!canEdit}
                                    className="w-full px-2 py-1.5 border border-gray-300 rounded bg-blue-50/50 text-blue-800 text-xs font-semibold"
                                  >
                                    <option value="any">any line</option>
                                    <option value="every">every line</option>
                                  </select>
                                </div>
                              )}

                              {/* Field selector */}
                              <div className="flex-1 min-w-[140px]">
                                <select
                                  value={cond.field}
                                  onChange={(e) =>
                                    updateConditionInGroup(gIdx, cIdx, { field: e.target.value })
                                  }
                                  disabled={!canEdit}
                                  className="w-full px-2 py-1.5 border border-gray-300 rounded bg-white text-xs"
                                >
                                  {fieldOpts.map((f) => (
                                    <option key={f.key} value={f.key}>
                                      {f.label}
                                    </option>
                                  ))}
                                </select>
                              </div>

                              {/* Operator selector */}
                              <div className="w-[110px] shrink-0">
                                <select
                                  value={cond.operator}
                                  onChange={(e) =>
                                    updateConditionInGroup(gIdx, cIdx, {
                                      operator: e.target.value as ScrubOperator,
                                    })
                                  }
                                  disabled={!canEdit}
                                  className="w-full px-2 py-1.5 border border-gray-300 rounded bg-white text-xs font-medium"
                                >
                                  {OPERATOR_OPTIONS.map((opt) => (
                                    <option key={opt.value} value={opt.value}>
                                      {opt.label}
                                    </option>
                                  ))}
                                </select>
                              </div>

                              {/* Value input (if not empty / not is_empty) */}
                              {!hideValue && (
                                <div className="w-[120px] shrink-0">
                                  {activeField?.fixedOptions && activeField.fixedOptions.length > 0 ? (
                                    <select
                                      value={String(cond.value ?? "")}
                                      onChange={(e) =>
                                        updateConditionInGroup(gIdx, cIdx, { value: e.target.value })
                                      }
                                      disabled={!canEdit}
                                      className="w-full px-2 py-1.5 border border-gray-300 rounded bg-white text-xs"
                                    >
                                      <option value="">Select...</option>
                                      {activeField.fixedOptions.map((v) => (
                                        <option key={v} value={v}>
                                          {v}
                                        </option>
                                      ))}
                                    </select>
                                  ) : (
                                    <input
                                      type="text"
                                      value={cond.value ?? ""}
                                      onChange={(e) =>
                                        updateConditionInGroup(gIdx, cIdx, { value: e.target.value })
                                      }
                                      disabled={!canEdit}
                                      placeholder="Value..."
                                      className="w-full px-2 py-1.5 border border-gray-300 rounded bg-white text-xs"
                                    />
                                  )}
                                </div>
                              )}

                              {/* Remove condition */}
                              <button
                                type="button"
                                onClick={() => removeConditionFromGroup(gIdx, cIdx)}
                                disabled={!canEdit || grp.conditions.length <= 1}
                                className="p-1 text-gray-400 hover:text-red-500 disabled:opacity-20 transition-colors"
                                title="Remove condition"
                              >
                                <X className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          );
                        })}
                      </div>

                      {/* Add condition button inside group */}
                      <button
                        type="button"
                        onClick={() => addConditionToGroup(gIdx)}
                        disabled={!canEdit}
                        className="text-xs text-blue-600 hover:text-blue-800 font-semibold flex items-center gap-1 mt-1 cursor-pointer"
                      >
                        <Plus className="w-3 h-3" />
                        Add condition
                      </button>
                    </div>
                  ))}

                  {/* Add group button */}
                  <button
                    type="button"
                    onClick={addGroup}
                    disabled={!canEdit}
                    className="w-full py-2 border border-dashed border-gray-300 rounded-xl text-xs font-semibold text-gray-600 hover:border-gray-400 hover:text-gray-800 flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <Layers className="w-3.5 h-3.5 text-gray-500" />
                    Add condition group
                  </button>
                </div>
              </div>

              {/* THEN Block */}
              <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-2xs space-y-4">
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded-md bg-purple-50 text-purple-700 font-bold text-xs uppercase border border-purple-200">
                    THEN
                  </span>
                  <span className="text-xs font-semibold text-gray-700">
                    Action when rule conditions match:
                  </span>
                </div>

                {/* Severity Selection */}
                <div>
                  <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-2">
                    Issue Severity *
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setEditingRule({ ...editingRule, severity: "error" })}
                      disabled={!canEdit}
                      className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                        editingRule.severity === "error"
                          ? "border-red-500 bg-red-50/50 ring-2 ring-red-500/20"
                          : "border-gray-200 hover:border-gray-300 bg-white"
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <AlertCircle className="w-4 h-4 text-red-600" />
                        <span className="text-xs font-bold text-red-700 uppercase">Error</span>
                      </div>
                      <p className="text-[11px] text-gray-500 mt-1">
                        Moves claim to Scrub failed + creates task. Cannot submit.
                      </p>
                    </button>

                    <button
                      type="button"
                      onClick={() => setEditingRule({ ...editingRule, severity: "warning" })}
                      disabled={!canEdit}
                      className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                        editingRule.severity === "warning"
                          ? "border-amber-500 bg-amber-50/50 ring-2 ring-amber-500/20"
                          : "border-gray-200 hover:border-gray-300 bg-white"
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <AlertTriangle className="w-4 h-4 text-amber-600" />
                        <span className="text-xs font-bold text-amber-700 uppercase">Warning</span>
                      </div>
                      <p className="text-[11px] text-gray-500 mt-1">
                        Flags claim for review. Submission is still allowed.
                      </p>
                    </button>
                  </div>
                </div>

                {/* Message input */}
                <div>
                  <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
                    Failure Message *
                  </label>
                  <input
                    type="text"
                    value={editingRule.message || ""}
                    onChange={(e) => setEditingRule({ ...editingRule, message: e.target.value })}
                    disabled={!canEdit}
                    placeholder="e.g. Add RT or LT laterality modifier to cataract surgery line"
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                  />
                  <p className="text-[11px] text-gray-400 mt-1">
                    This message is displayed to billing staff on the claim drawer and scrub reports.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="bg-white px-6 py-3.5 border-t border-gray-200 flex items-center justify-between shrink-0 shadow-lg">
          {editingRule ? (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setEditingRule(null)}
                className="text-xs font-semibold"
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={handleSaveEditingRule}
                disabled={!canEdit}
                className="text-xs font-semibold bg-[#0f172a] hover:bg-[#1e293b] text-white flex items-center gap-1.5"
              >
                <Save className="w-3.5 h-3.5" />
                Save Rule
              </Button>
            </>
          ) : (
            <>
              <span className="text-xs text-gray-500">
                {rules.length} rule{rules.length !== 1 ? "s" : ""} registered
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={onClose}
                className="text-xs font-semibold"
              >
                Close
              </Button>
            </>
          )}
        </div>
      </div>
    </>
  );
}
