import React, { useState, useEffect } from "react";
import DrawerShell from "../ui/DrawerShell";
import { ClientInsurance, GuarantorDetails, WorkersCompDetails } from "../../types/rcmTypes";
import {
  ShieldCheck,
  ShieldAlert,
  Calendar,
  User,
  Building,
  UploadCloud,
  FileText,
  Check,
  AlertCircle,
  X,
  CreditCard,
} from "lucide-react";
import { toast } from "sonner";

interface ClientInsuranceEditorProps {
  isOpen: boolean;
  onClose: () => void;
  client: { id: string; name: string; email?: string; phone?: string; insurance?: ClientInsurance };
  onSave: (insurance: ClientInsurance) => void;
}

const COMMON_PAYERS = [
  "Blue Cross Blue Shield",
  "Aetna Health",
  "UnitedHealthcare",
  "Cigna",
  "Medicare Part B",
  "Medicaid",
  "Workers' Comp",
  "Self Pay",
  "Missing Insurance",
];

export default function ClientInsuranceEditor({
  isOpen,
  onClose,
  client,
  onSave,
}: ClientInsuranceEditorProps) {
  const existing = client.insurance;

  const [payerName, setPayerName] = useState(existing?.payerName || "");
  const [policyNumber, setPolicyNumber] = useState(existing?.policyNumber || "");
  const [groupNumber, setGroupNumber] = useState(existing?.groupNumber || "");
  const [effectiveDate, setEffectiveDate] = useState(existing?.effectiveDate || "");
  const [expirationDate, setExpirationDate] = useState(existing?.expirationDate || "");
  const [guarantor, setGuarantor] = useState<"self" | "spouse" | "parent" | "other">(existing?.guarantor || "self");
  const [guarantorDetails, setGuarantorDetails] = useState<GuarantorDetails>(
    existing?.guarantorDetails || {
      firstName: "",
      lastName: "",
      email: "",
      phone: "",
      dob: "",
      gender: "",
      address: "",
    }
  );
  const [requiresPriorAuth, setRequiresPriorAuth] = useState(existing?.requiresPriorAuth || false);
  const [workersCompDetails, setWorkersCompDetails] = useState<WorkersCompDetails>(
    existing?.workersCompDetails || {
      claimNumber: "",
      accidentDate: "",
      employer: "",
      accidentState: "CA",
    }
  );
  const [cardPhotoUrl, setCardPhotoUrl] = useState<string | undefined>(existing?.cardPhotoUrl);

  useEffect(() => {
    if (client.insurance) {
      setPayerName(client.insurance.payerName || "");
      setPolicyNumber(client.insurance.policyNumber || "");
      setGroupNumber(client.insurance.groupNumber || "");
      setEffectiveDate(client.insurance.effectiveDate || "");
      setExpirationDate(client.insurance.expirationDate || "");
      setGuarantor(client.insurance.guarantor || "self");
      setGuarantorDetails(
        client.insurance.guarantorDetails || {
          firstName: "",
          lastName: "",
          email: "",
          phone: "",
          dob: "",
          gender: "",
          address: "",
        }
      );
      setRequiresPriorAuth(client.insurance.requiresPriorAuth || false);
      setWorkersCompDetails(
        client.insurance.workersCompDetails || {
          claimNumber: "",
          accidentDate: "",
          employer: "",
          accidentState: "CA",
        }
      );
      setCardPhotoUrl(client.insurance.cardPhotoUrl);
    }
  }, [client.insurance, isOpen]);

  const isSelfPay = payerName === "Self Pay";
  const isMissing = payerName === "Missing Insurance";
  const isWorkersComp = payerName === "Workers' Comp";

  const handleCardUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const url = URL.createObjectURL(file);
      setCardPhotoUrl(url);
      toast.success("Insurance card photo attached");
    }
  };

  const handleSave = () => {
    if (!payerName.trim()) {
      toast.error("Please select or enter an insurance company or coverage status");
      return;
    }

    const payload: ClientInsurance = {
      payerName: payerName.trim(),
      policyNumber: isSelfPay ? undefined : policyNumber.trim(),
      groupNumber: isSelfPay ? undefined : groupNumber.trim(),
      effectiveDate: isSelfPay ? undefined : effectiveDate,
      expirationDate: isSelfPay ? undefined : expirationDate,
      guarantor,
      guarantorDetails: guarantor !== "self" ? guarantorDetails : undefined,
      requiresPriorAuth,
      workersCompDetails: isWorkersComp ? workersCompDetails : undefined,
      cardPhotoUrl,
      updatedAt: new Date().toISOString(),
    };

    onSave(payload);
    onClose();
  };

  return (
    <DrawerShell
      isOpen={isOpen}
      onClose={onClose}
      title="Edit Patient Insurance & Coverage"
      subtitle={`Client: ${client.name} (ID: ${client.id})`}
      icon={<ShieldCheck className="w-5 h-5 text-blue-600" />}
      width="max-w-[720px]"
      headerRight={
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="flex items-center gap-1.5 px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold shadow-xs transition-all cursor-pointer"
          >
            <Check className="w-3.5 h-3.5" /> Save Coverage
          </button>
        </div>
      }
    >
      <div className="p-6 space-y-6 h-full overflow-y-auto" style={{ fontFamily: "DM Sans, sans-serif" }}>
        {/* Payer Selection */}
        <div className="p-5 bg-white border border-slate-200 rounded-2xl shadow-2xs space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              Insurance Company (Payer) *
            </label>
            <p className="text-xs text-slate-400 mb-2">
              Select a primary payer, or choose "Self Pay" / "Missing Insurance".
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {COMMON_PAYERS.map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setPayerName(p)}
                  className={`p-2.5 rounded-xl border text-xs font-medium text-left transition-all cursor-pointer ${
                    payerName === p
                      ? "border-blue-600 bg-blue-50 text-blue-900 font-bold shadow-2xs"
                      : "border-slate-200 hover:border-slate-300 text-slate-700 hover:bg-slate-50"
                  }`}
                >
                  {p}
                </button>
              ))}
            </div>
            <div className="mt-3">
              <label className="text-[11px] font-semibold text-slate-500 mb-1 block">Or enter custom payer name:</label>
              <input
                type="text"
                value={payerName}
                onChange={(e) => setPayerName(e.target.value)}
                placeholder="e.g. Kaiser Permanente, Humana..."
                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
          </div>
        </div>

        {/* Self Pay View */}
        {isSelfPay && (
          <div className="p-5 bg-amber-50 border border-amber-200 rounded-2xl text-amber-900 space-y-2">
            <div className="flex items-center gap-2 font-bold text-sm">
              <CreditCard className="w-4 h-4 text-amber-600" /> Patient Marked as Self-Pay
            </div>
            <p className="text-xs text-amber-800 leading-relaxed">
              No insurance claims or clearinghouse transmissions will be initiated. All appointments and completed encounters will generate direct patient invoices or prompt for card payments on file.
            </p>
          </div>
        )}

        {/* Missing Insurance View */}
        {isMissing && (
          <div className="p-5 bg-rose-50 border border-rose-200 rounded-2xl text-rose-900 space-y-2">
            <div className="flex items-center gap-2 font-bold text-sm">
              <ShieldAlert className="w-4 h-4 text-rose-600" /> Flagged: Missing Insurance
            </div>
            <p className="text-xs text-rose-800 leading-relaxed">
              Patient will be listed on the <strong>Insurance Intake Worklist</strong> for front-desk follow-up. Eligibility checks will remain gated until valid policy details are entered.
            </p>
          </div>
        )}

        {/* Policy Details (when not Self Pay and not Missing) */}
        {!isSelfPay && !isMissing && (
          <>
            {/* Policy & Group Numbers */}
            <div className="p-5 bg-white border border-slate-200 rounded-2xl shadow-2xs space-y-4">
              <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                Policy Information
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">
                    Policy / Member ID *
                  </label>
                  <input
                    type="text"
                    value={policyNumber}
                    onChange={(e) => setPolicyNumber(e.target.value)}
                    placeholder="e.g. BCBS-99218274"
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-mono text-slate-900 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">
                    Group Number
                  </label>
                  <input
                    type="text"
                    value={groupNumber}
                    onChange={(e) => setGroupNumber(e.target.value)}
                    placeholder="e.g. GRP-44021"
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-mono text-slate-900 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">
                    Effective Date
                  </label>
                  <input
                    type="date"
                    value={effectiveDate}
                    onChange={(e) => setEffectiveDate(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">
                    Expiration Date
                  </label>
                  <input
                    type="date"
                    value={expirationDate}
                    onChange={(e) => setExpirationDate(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
              </div>

              {/* Requires Prior Auth Toggle */}
              <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-slate-800 block">Requires Prior Authorization on Submission</span>
                  <span className="text-[11px] text-slate-400">Claims scrubbing rule will enforce active PA before clearing</span>
                </div>
                <button
                  type="button"
                  onClick={() => setRequiresPriorAuth(!requiresPriorAuth)}
                  className={`w-11 h-6 flex items-center rounded-full p-1 transition-colors cursor-pointer ${
                    requiresPriorAuth ? "bg-blue-600 justify-end" : "bg-slate-300 justify-start"
                  }`}
                >
                  <div className="w-4 h-4 rounded-full bg-white shadow-md" />
                </button>
              </div>
            </div>

            {/* Workers' Comp Specific Fields */}
            {isWorkersComp && (
              <div className="p-5 bg-blue-50/50 border border-blue-200 rounded-2xl shadow-2xs space-y-4">
                <div className="flex items-center gap-2">
                  <Building className="w-4 h-4 text-blue-600" />
                  <h4 className="text-xs font-bold text-blue-950 uppercase tracking-wider">
                    Workers' Compensation / Auto Claim Details
                  </h4>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Claim Number *</label>
                    <input
                      type="text"
                      value={workersCompDetails.claimNumber}
                      onChange={(e) => setWorkersCompDetails({ ...workersCompDetails, claimNumber: e.target.value })}
                      placeholder="WC-2026-991"
                      className="w-full px-3 py-2 bg-white border border-blue-200 rounded-xl text-xs font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Accident Date *</label>
                    <input
                      type="date"
                      value={workersCompDetails.accidentDate}
                      onChange={(e) => setWorkersCompDetails({ ...workersCompDetails, accidentDate: e.target.value })}
                      className="w-full px-3 py-2 bg-white border border-blue-200 rounded-xl text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Employer / Company Name</label>
                    <input
                      type="text"
                      value={workersCompDetails.employer}
                      onChange={(e) => setWorkersCompDetails({ ...workersCompDetails, employer: e.target.value })}
                      placeholder="Employer Co."
                      className="w-full px-3 py-2 bg-white border border-blue-200 rounded-xl text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Accident State</label>
                    <input
                      type="text"
                      value={workersCompDetails.accidentState || "CA"}
                      onChange={(e) => setWorkersCompDetails({ ...workersCompDetails, accidentState: e.target.value })}
                      placeholder="e.g. CA, NY"
                      className="w-full px-3 py-2 bg-white border border-blue-200 rounded-xl text-xs font-mono"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Guarantor / Relationship to Policyholder */}
            <div className="p-5 bg-white border border-slate-200 rounded-2xl shadow-2xs space-y-4">
              <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                Guarantor (Relationship to Policyholder)
              </h4>
              <div className="flex flex-wrap gap-2">
                {(["self", "spouse", "parent", "other"] as const).map((g) => (
                  <button
                    key={g}
                    type="button"
                    onClick={() => setGuarantor(g)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold capitalize transition-all cursor-pointer ${
                      guarantor === g
                        ? "bg-blue-600 text-white shadow-2xs"
                        : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                    }`}
                  >
                    {g === "self" ? "Self (Patient is Policyholder)" : g}
                  </button>
                ))}
              </div>

              {guarantor !== "self" && (
                <div className="pt-3 border-t border-slate-100 space-y-3">
                  <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                    Policyholder Demographics
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="text-[11px] font-semibold text-slate-600 block mb-1">First Name</label>
                      <input
                        type="text"
                        value={guarantorDetails.firstName}
                        onChange={(e) => setGuarantorDetails({ ...guarantorDetails, firstName: e.target.value })}
                        className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-xs"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-semibold text-slate-600 block mb-1">Last Name</label>
                      <input
                        type="text"
                        value={guarantorDetails.lastName}
                        onChange={(e) => setGuarantorDetails({ ...guarantorDetails, lastName: e.target.value })}
                        className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-xs"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-semibold text-slate-600 block mb-1">Phone</label>
                      <input
                        type="text"
                        value={guarantorDetails.phone || ""}
                        onChange={(e) => setGuarantorDetails({ ...guarantorDetails, phone: e.target.value })}
                        className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-xs"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-semibold text-slate-600 block mb-1">Date of Birth</label>
                      <input
                        type="date"
                        value={guarantorDetails.dob || ""}
                        onChange={(e) => setGuarantorDetails({ ...guarantorDetails, dob: e.target.value })}
                        className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-xs"
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Insurance Card Upload */}
            <div className="p-5 bg-white border border-slate-200 rounded-2xl shadow-2xs space-y-3">
              <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                Insurance Card Photo / Document
              </h4>
              <p className="text-xs text-slate-400">Attach front/back image of physical member card for compliance.</p>

              {cardPhotoUrl ? (
                <div className="flex items-center gap-3 p-3 bg-slate-50 border border-slate-200 rounded-xl">
                  <FileText className="w-5 h-5 text-blue-600 flex-shrink-0" />
                  <span className="text-xs font-mono text-slate-700 truncate flex-1">Insurance_Card_Scan.png</span>
                  <button
                    type="button"
                    onClick={() => setCardPhotoUrl(undefined)}
                    className="p-1 text-slate-400 hover:text-rose-600"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <label className="flex flex-col items-center justify-center p-6 border-2 border-dashed border-slate-200 hover:border-blue-400 rounded-xl bg-slate-50/50 hover:bg-blue-50/30 transition-all cursor-pointer">
                  <UploadCloud className="w-6 h-6 text-slate-400 mb-1" />
                  <span className="text-xs font-semibold text-blue-600">Click to upload insurance card</span>
                  <span className="text-[10px] text-slate-400 mt-0.5">PNG, JPG, or PDF up to 10MB</span>
                  <input type="file" accept="image/*,.pdf" onChange={handleCardUpload} className="hidden" />
                </label>
              )}
            </div>
          </>
        )}
      </div>
    </DrawerShell>
  );
}
