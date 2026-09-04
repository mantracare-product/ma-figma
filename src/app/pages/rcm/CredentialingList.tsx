import React, { useState } from "react";
import { useRcm } from "../../context/RcmContext";
import PageHeader from "../../components/layout/PageHeader";
import { HowItWorksModal, HowItWorksButton } from "../../components/help/HowItWorksModal";
import DrawerShell from "../../components/ui/DrawerShell";
import { CredentialingRecord } from "../../types/rcmTypes";
import {
  ShieldCheck,
  ShieldAlert,
  CheckCircle2,
  Clock,
  AlertTriangle,
  User,
  Plus,
  Edit2,
  Calendar,
} from "lucide-react";
import { toast } from "sonner";

export default function CredentialingList() {
  const { credentialing, addCredentialingRecord, updateCredentialingRecord } = useRcm();
  const [showHelp, setShowHelp] = useState(false);
  const [selectedCred, setSelectedCred] = useState<CredentialingRecord | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  // New Record Form State
  const [newProviderName, setNewProviderName] = useState("Dr. Marcus Vance, MD");
  const [newProviderId, setNewProviderId] = useState("PRV-001");
  const [newPayerName, setNewPayerName] = useState("Aetna Behavioral Health");
  const [newNpi, setNewNpi] = useState("1982736450");
  const [newTaxId, setNewTaxId] = useState("XX-XXX4821");
  const [newCredStatus, setNewCredStatus] = useState<CredentialingRecord["trueCredentialingStatus"]>("credentialed");
  const [newEnrollStatus, setNewEnrollStatus] = useState<CredentialingRecord["transactionEnrollmentStatus"]>("live");
  const [newEffectiveDate, setNewEffectiveDate] = useState("2024-01-01");
  const [newTerminationDate, setNewTerminationDate] = useState("");

  const handleCreateCred = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProviderName.trim() || !newPayerName.trim()) {
      toast.error("Please enter clinician name and payer name");
      return;
    }

    addCredentialingRecord({
      providerId: newProviderId,
      providerName: newProviderName,
      payerName: newPayerName,
      npi: newNpi,
      taxId: newTaxId,
      trueCredentialingStatus: newCredStatus,
      transactionEnrollmentStatus: newEnrollStatus,
      effectiveDate: newEffectiveDate,
      terminationDate: newTerminationDate || undefined,
      isServiceDateValid: true,
    });

    toast.success(`Credentialing entry for ${newProviderName} with ${newPayerName} registered`);
    setIsCreating(false);
  };

  const handleUpdateCred = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCred) return;
    updateCredentialingRecord(selectedCred.id, {
      trueCredentialingStatus: selectedCred.trueCredentialingStatus,
      transactionEnrollmentStatus: selectedCred.transactionEnrollmentStatus,
      effectiveDate: selectedCred.effectiveDate,
      terminationDate: selectedCred.terminationDate,
    });
    toast.success(`Updated credentialing for ${selectedCred.providerName} (${selectedCred.payerName})`);
    setSelectedCred(null);
  };

  return (
    <div className="space-y-6" style={{ fontFamily: "DM Sans, sans-serif" }}>
      {/* Page Header */}
      <PageHeader
        title="Provider Credentialing & Payer Enrollment"
        subtitle="Track clinical panel credentialing status and electronic EDI 837/835 clearinghouse transaction enrollment"
        action={
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setIsCreating(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold shadow-xs transition-colors cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" /> Add Credentialing Entry
            </button>
            <HowItWorksButton onClick={() => setShowHelp(true)} />
          </div>
        }
      />

      {/* Differentiator Notice */}
      <div className="p-4 bg-blue-50/70 border border-blue-200 rounded-2xl flex items-start gap-3 shadow-2xs">
        <ShieldCheck className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
        <div className="text-xs text-blue-950 space-y-1">
          <h4 className="font-bold">Credentialing vs Transaction Enrollment Separation</h4>
          <p className="text-blue-900/80 leading-relaxed">
            A clinician may be fully credentialed on a payer's clinical panel but pending EDI 837/835 clearinghouse transaction enrollment. Keeping these two states distinct prevents claims from being sent to payers before electronic billing gates are activated.
          </p>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/70 text-slate-400 font-bold uppercase text-[10px] tracking-wider">
                <th className="px-5 py-3">Clinician / Provider</th>
                <th className="px-5 py-3">Payer</th>
                <th className="px-5 py-3">NPI / Tax ID</th>
                <th className="px-5 py-3 text-center">True Credentialing Status</th>
                <th className="px-5 py-3 text-center">EDI Transaction Enrollment</th>
                <th className="px-5 py-3">Effective Range</th>
                <th className="px-5 py-3 text-center">Service Date Compliance</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-sans">
              {credentialing.map((cred) => (
                <tr
                  key={cred.id}
                  onClick={() => setSelectedCred(cred)}
                  className="hover:bg-blue-50/30 cursor-pointer transition-colors"
                >
                  <td className="px-5 py-3">
                    <div className="font-bold text-slate-900">{cred.providerName}</div>
                    <span className="text-[10px] font-mono text-slate-400">{cred.providerId}</span>
                  </td>
                  <td className="px-5 py-3 font-medium text-slate-900">{cred.payerName}</td>
                  <td className="px-5 py-3 font-mono text-[11px] text-slate-600">
                    <div>NPI: {cred.npi}</div>
                    <div className="text-slate-400">TID: {cred.taxId}</div>
                  </td>
                  <td className="px-5 py-3 text-center">
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-[11px] font-semibold font-mono ${
                        cred.trueCredentialingStatus === "credentialed"
                          ? "bg-emerald-100 text-emerald-800"
                          : "bg-amber-100 text-amber-800"
                      }`}
                    >
                      {cred.trueCredentialingStatus}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-center">
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-[11px] font-semibold font-mono ${
                        cred.transactionEnrollmentStatus === "live"
                          ? "bg-emerald-100 text-emerald-800"
                          : cred.transactionEnrollmentStatus === "action_required"
                          ? "bg-rose-100 text-rose-800"
                          : "bg-amber-100 text-amber-800"
                      }`}
                    >
                      {cred.transactionEnrollmentStatus.replace("_", " ")}
                    </span>
                  </td>
                  <td className="px-5 py-3 font-mono text-[11px] text-slate-600">
                    {cred.effectiveDate} to {cred.terminationDate || "Indefinite"}
                  </td>
                  <td className="px-5 py-3 text-center">
                    {cred.isServiceDateValid ? (
                      <span className="inline-flex items-center gap-1 text-emerald-700 font-bold text-[11px]">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Valid
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-rose-700 font-bold text-[11px]">
                        <AlertTriangle className="w-3.5 h-3.5" /> Out of Period
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Credentialing Entry Drawer */}
      {isCreating && (
        <DrawerShell
          isOpen={isCreating}
          onClose={() => setIsCreating(false)}
          title="Add Provider Credentialing Entry"
          subtitle="Register clinical panel credentialing and EDI clearinghouse transaction enrollment"
          footer={
            <div className="flex items-center justify-end gap-2 w-full">
              <button
                type="button"
                onClick={() => setIsCreating(false)}
                className="px-4 py-2 border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                type="submit"
                form="new-cred-form"
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold shadow-2xs"
              >
                Save Record
              </button>
            </div>
          }
        >
          <form id="new-cred-form" onSubmit={handleCreateCred} className="space-y-4 text-xs text-slate-800">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Provider / Clinician Name *</label>
                <input
                  type="text"
                  value={newProviderName}
                  onChange={(e) => setNewProviderName(e.target.value)}
                  required
                  className="w-full p-2.5 bg-white border border-slate-200 rounded-xl text-xs text-slate-900"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Provider ID</label>
                <input
                  type="text"
                  value={newProviderId}
                  onChange={(e) => setNewProviderId(e.target.value)}
                  className="w-full p-2.5 bg-white border border-slate-200 rounded-xl font-mono text-xs text-slate-900"
                />
              </div>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Payer Name *</label>
              <input
                type="text"
                value={newPayerName}
                onChange={(e) => setNewPayerName(e.target.value)}
                required
                className="w-full p-2.5 bg-white border border-slate-200 rounded-xl text-xs text-slate-900"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Individual NPI</label>
                <input
                  type="text"
                  value={newNpi}
                  onChange={(e) => setNewNpi(e.target.value)}
                  className="w-full p-2.5 bg-white border border-slate-200 rounded-xl font-mono text-xs text-slate-900"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Billing Tax ID (TIN)</label>
                <input
                  type="text"
                  value={newTaxId}
                  onChange={(e) => setNewTaxId(e.target.value)}
                  className="w-full p-2.5 bg-white border border-slate-200 rounded-xl font-mono text-xs text-slate-900"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">True Credentialing Status</label>
                <select
                  value={newCredStatus}
                  onChange={(e) => setNewCredStatus(e.target.value as any)}
                  className="w-full p-2.5 bg-white border border-slate-200 rounded-xl text-xs text-slate-900"
                >
                  <option value="credentialed">Credentialed (Approved)</option>
                  <option value="pending">Pending Committee Review</option>
                  <option value="not_credentialed">Not Credentialed</option>
                  <option value="recredentialing_due">Re-credentialing Due</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">EDI Transaction Enrollment</label>
                <select
                  value={newEnrollStatus}
                  onChange={(e) => setNewEnrollStatus(e.target.value as any)}
                  className="w-full p-2.5 bg-white border border-slate-200 rounded-xl text-xs text-slate-900"
                >
                  <option value="live">Live (ERA/EDI 837 Active)</option>
                  <option value="pending_edi">Pending EDI Packet</option>
                  <option value="action_required">Action Required (Rejected)</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Effective Date</label>
                <input
                  type="date"
                  value={newEffectiveDate}
                  onChange={(e) => setNewEffectiveDate(e.target.value)}
                  className="w-full p-2.5 bg-white border border-slate-200 rounded-xl text-xs text-slate-900"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Termination Date (Optional)</label>
                <input
                  type="date"
                  value={newTerminationDate}
                  onChange={(e) => setNewTerminationDate(e.target.value)}
                  className="w-full p-2.5 bg-white border border-slate-200 rounded-xl text-xs text-slate-900"
                />
              </div>
            </div>
          </form>
        </DrawerShell>
      )}

      {/* Edit Credentialing Drawer */}
      {selectedCred && (
        <DrawerShell
          isOpen={!!selectedCred}
          onClose={() => setSelectedCred(null)}
          title={`Credentialing: ${selectedCred.providerName}`}
          subtitle={`Payer: ${selectedCred.payerName}`}
          footer={
            <div className="flex items-center justify-end gap-2 w-full">
              <button
                type="button"
                onClick={() => setSelectedCred(null)}
                className="px-4 py-2 border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                type="submit"
                form="edit-cred-form"
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold shadow-2xs"
              >
                Save Updates
              </button>
            </div>
          }
        >
          <form id="edit-cred-form" onSubmit={handleUpdateCred} className="space-y-4 text-xs text-slate-800">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">True Credentialing Status</label>
                <select
                  value={selectedCred.trueCredentialingStatus}
                  onChange={(e) =>
                    setSelectedCred({
                      ...selectedCred,
                      trueCredentialingStatus: e.target.value as any,
                    })
                  }
                  className="w-full p-2.5 bg-white border border-slate-200 rounded-xl text-xs text-slate-900"
                >
                  <option value="credentialed">Credentialed (Approved)</option>
                  <option value="pending">Pending Committee Review</option>
                  <option value="not_credentialed">Not Credentialed</option>
                  <option value="recredentialing_due">Re-credentialing Due</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">EDI Transaction Enrollment</label>
                <select
                  value={selectedCred.transactionEnrollmentStatus}
                  onChange={(e) =>
                    setSelectedCred({
                      ...selectedCred,
                      transactionEnrollmentStatus: e.target.value as any,
                    })
                  }
                  className="w-full p-2.5 bg-white border border-slate-200 rounded-xl text-xs text-slate-900"
                >
                  <option value="live">Live (ERA/EDI 837 Active)</option>
                  <option value="pending_edi">Pending EDI Packet</option>
                  <option value="action_required">Action Required (Rejected)</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Effective Date</label>
                <input
                  type="date"
                  value={selectedCred.effectiveDate}
                  onChange={(e) => setSelectedCred({ ...selectedCred, effectiveDate: e.target.value })}
                  className="w-full p-2.5 bg-white border border-slate-200 rounded-xl text-xs text-slate-900"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Termination Date</label>
                <input
                  type="date"
                  value={selectedCred.terminationDate || ""}
                  onChange={(e) => setSelectedCred({ ...selectedCred, terminationDate: e.target.value })}
                  className="w-full p-2.5 bg-white border border-slate-200 rounded-xl text-xs text-slate-900"
                />
              </div>
            </div>
          </form>
        </DrawerShell>
      )}

      {/* How It Works Modal */}
      <HowItWorksModal
        isOpen={showHelp}
        onClose={() => setShowHelp(false)}
        title="How Provider Credentialing & EDI Enrollment Works"
        summary="Clinical panels and electronic billing gateways require independent management to prevent claim rejections due to un-enrolled provider NPIs."
        bullets={[
          "Two-Tier State Tracking: Separates clinical credentialing approval from electronic ERA/EDI transaction clearance.",
          "Service Date Compliance: Verifies that encounters occurred within the clinician's active effective window before submission.",
          "Re-credentialing Alerts: Proactively tracks CAQH re-attestation cycles and periodic re-credentialing deadlines.",
        ]}
      />
    </div>
  );
}
