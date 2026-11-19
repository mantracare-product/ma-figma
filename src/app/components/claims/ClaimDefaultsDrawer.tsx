import React, { useState, useEffect } from "react";
import { X, Save, FileText, Building2, MapPin, Check, Info } from "lucide-react";
import { Button } from "../ui/Button";
import { Switch } from "../ui/switch";
import { Tooltip } from "../ui/Tooltip";
import { toast } from "sonner";
import { useCurrentPermissions } from "../../hooks/useCurrentPermissions";
import {
  claimDefaultsStore,
  type ClaimDefaults,
} from "../../../lib/billingSetupStore";
import { getOrgLocations } from "../../../lib/orgBilling";

export interface ClaimDefaultsDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

export const NATIONAL_POS_CODES: Array<{ code: string; name: string }> = [
  { code: "01", name: "Pharmacy" },
  { code: "02", name: "Telehealth (Other than Patient's Home)" },
  { code: "10", name: "Telehealth (Patient's Home)" },
  { code: "11", name: "Office" },
  { code: "12", name: "Home" },
  { code: "19", name: "Off Campus-Outpatient Hospital" },
  { code: "21", name: "Inpatient Hospital" },
  { code: "22", name: "On Campus-Outpatient Hospital" },
  { code: "23", name: "Emergency Room - Hospital" },
  { code: "24", name: "Ambulatory Surgical Center" },
  { code: "31", name: "Skilled Nursing Facility" },
  { code: "32", name: "Nursing Facility" },
  { code: "49", name: "Independent Clinic" },
  { code: "50", name: "Federally Qualified Health Center" },
  { code: "53", name: "Community Mental Health Center" },
  { code: "81", name: "Independent Laboratory" },
  { code: "99", name: "Other Place of Service" },
];

export default function ClaimDefaultsDrawer({
  isOpen,
  onClose,
}: ClaimDefaultsDrawerProps) {
  const { hasPermission } = useCurrentPermissions();
  const canEdit = hasPermission("billingSetup", "edit");

  const [defaults, setDefaults] = useState<ClaimDefaults>(() => claimDefaultsStore.get());
  const [locations, setLocations] = useState(() => getOrgLocations());

  useEffect(() => {
    if (isOpen) {
      setDefaults(claimDefaultsStore.get());
      setLocations(getOrgLocations());
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSave = () => {
    if (!canEdit) {
      toast.error("You don't have permission to edit billing defaults");
      return;
    }
    claimDefaultsStore.save({
      ...defaults,
      timelyFilingDays: Number(defaults.timelyFilingDays) || 90,
      signatureOnFile: defaults.signatureOnFile !== false,
      releaseOfInformation: defaults.releaseOfInformation !== false,
      acceptAssignment: defaults.acceptAssignment !== false,
    });
    toast.success("Claim defaults saved successfully");
    onClose();
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
        className="fixed inset-y-0 right-0 z-50 w-full max-w-[620px] bg-[#fafafa] shadow-2xl flex flex-col border-l border-gray-200 animate-in slide-in-from-right duration-300"
        style={{ fontFamily: "Outfit, sans-serif" }}
        data-testid="claim-defaults-drawer"
      >
        {/* Header */}
        <div className="bg-white px-6 py-4 border-b border-gray-200 flex items-center justify-between shrink-0 shadow-2xs">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold text-sm shadow-xs shrink-0 border border-blue-100">
              <FileText className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h2 className="text-base font-bold text-[#111827] leading-tight">Claim Defaults</h2>
              <p className="text-xs text-gray-500 mt-0.5">
                Default location, place of service fallback, and standard claim filing policies
                {!canEdit && " (read-only)"}
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
            {canEdit && (
              <Button
                variant="primary"
                size="sm"
                onClick={handleSave}
                className="bg-[#111827] hover:bg-[#1f2937] text-white text-xs font-semibold flex items-center gap-1.5 shadow-xs cursor-pointer"
              >
                <Save className="w-3.5 h-3.5" />
                Save Changes
              </Button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors ml-1 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-4 shadow-xs">
            {/* 1. Default Billing Location */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Default Billing Location
              </label>
              <select
                disabled={!canEdit}
                value={defaults.defaultBillingLocationId || ""}
                onChange={(e) => setDefaults({ ...defaults, defaultBillingLocationId: e.target.value })}
                className="w-full h-9 px-3 bg-white border border-slate-200 rounded-lg text-xs font-medium text-slate-800 focus:outline-none focus:border-blue-500 disabled:bg-slate-50 disabled:text-slate-500 cursor-pointer"
              >
                <option value="">None selected</option>
                {locations.map((loc) => (
                  <option key={loc.id} value={loc.id}>
                    {loc.name} {loc.address ? `(${loc.address})` : ""}
                  </option>
                ))}
              </select>
              <p className="text-[11px] text-slate-400 mt-1">
                Locations configured under Organization &gt; Locations.
              </p>
            </div>

            {/* 2. Place of Service Fallback */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Place of Service Fallback (CMS POS Code)
              </label>
              <select
                disabled={!canEdit}
                value={defaults.defaultPos || "11"}
                onChange={(e) => setDefaults({ ...defaults, defaultPos: e.target.value })}
                className="w-full h-9 px-3 bg-white border border-slate-200 rounded-lg text-xs font-medium text-slate-800 focus:outline-none focus:border-blue-500 disabled:bg-slate-50 disabled:text-slate-500 cursor-pointer"
              >
                {NATIONAL_POS_CODES.map((pos) => (
                  <option key={pos.code} value={pos.code}>
                    {pos.code} - {pos.name}
                  </option>
                ))}
              </select>
              <p className="text-[11px] text-slate-400 mt-1">
                Used as a fallback when the appointment's clinic location has no specific POS code configured.
              </p>
            </div>

            {/* 3. Timely Filing Days Fallback */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Timely Filing Days (Fallback)
              </label>
              <input
                type="number"
                min={1}
                disabled={!canEdit}
                value={defaults.timelyFilingDays ?? 90}
                onChange={(e) => setDefaults({ ...defaults, timelyFilingDays: Number(e.target.value) })}
                className="w-full h-9 px-3 bg-white border border-slate-200 rounded-lg text-xs font-medium text-slate-800 focus:outline-none focus:border-blue-500 disabled:bg-slate-50 disabled:text-slate-500"
              />
              <p className="text-[11px] text-slate-400 mt-1">
                Global fallback window in days from date of service. An individual payer's timely filing setting overrides this value.
              </p>
            </div>

            {/* 4. Accept Assignment */}
            <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-slate-800">Accept Assignment</span>
                <p className="text-[11px] text-slate-500">
                  Participating provider accepts insurance/Medicare allowed charges as payment in full.
                </p>
              </div>
              <Switch
                disabled={!canEdit}
                checked={defaults.acceptAssignment !== false}
                onCheckedChange={(checked) => setDefaults({ ...defaults, acceptAssignment: checked })}
              />
            </div>

            {/* 5. Signature on File */}
            <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-slate-800">Signature on File</span>
                <p className="text-[11px] text-slate-500">
                  CMS-1500 Box 12: Patient or authorized person's signature is on file authorizing benefits.
                </p>
              </div>
              <Switch
                disabled={!canEdit}
                checked={defaults.signatureOnFile !== false}
                onCheckedChange={(checked) => setDefaults({ ...defaults, signatureOnFile: checked })}
              />
            </div>

            {/* 6. Release of Information */}
            <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-slate-800">Release of Information</span>
                <p className="text-[11px] text-slate-500">
                  CMS-1500 Box 13: Authorizes release of medical records required to adjudicate claims.
                </p>
              </div>
              <Switch
                disabled={!canEdit}
                checked={defaults.releaseOfInformation !== false}
                onCheckedChange={(checked) => setDefaults({ ...defaults, releaseOfInformation: checked })}
              />
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="bg-white px-6 py-4 border-t border-gray-200 flex items-center justify-end gap-2 shrink-0 shadow-2xs">
          <Button
            variant="outline"
            size="sm"
            onClick={onClose}
            className="text-xs text-gray-600 hover:text-gray-900 cursor-pointer"
          >
            Cancel
          </Button>
          {canEdit && (
            <Button
              variant="primary"
              size="sm"
              onClick={handleSave}
              className="bg-[#111827] hover:bg-[#1f2937] text-white text-xs font-semibold flex items-center gap-1.5 shadow-xs cursor-pointer"
            >
              <Save className="w-3.5 h-3.5" />
              Save Changes
            </Button>
          )}
        </div>
      </div>
    </>
  );
}
