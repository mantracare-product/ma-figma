import React from "react";
import { useRcm } from "../../context/RcmContext";
import PageHeader from "../../components/layout/PageHeader";
import { ShieldCheck, ShieldAlert, CheckCircle2, Clock, AlertTriangle, User } from "lucide-react";

export default function CredentialingList() {
  const { credentialing } = useRcm();

  return (
    <div className="space-y-6" style={{ fontFamily: "DM Sans, sans-serif" }}>
      {/* Section Header */}
      <div className="space-y-1">
        <h2
          className="text-2xl font-bold text-[#1e293b] tracking-tight"
          style={{ fontFamily: "Outfit, sans-serif" }}
        >
          Provider Credentialing & Payer Enrollment
        </h2>
        <p className="text-sm text-slate-500 font-normal">
          Track credentialing approval and EDI/ERA transaction enrollment status per provider
        </p>
      </div>

      {/* Differentiator Notice */}
      <div className="p-4 bg-blue-50/70 border border-blue-200 rounded-2xl flex items-start gap-3">
        <ShieldCheck className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
        <div className="text-xs text-blue-950 space-y-1">
          <h4 className="font-bold">Credentialing vs Transaction Enrollment Separation</h4>
          <p className="text-blue-900/80 leading-relaxed">
            A clinician may be fully credentialed with a payer but pending EDI 837/835 clearinghouse transaction enrollment. Keeping these two states distinct prevents claims from being sent to payers before electronic billing gates are activated.
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
                <tr key={cred.id} className="hover:bg-slate-50/60 transition-colors">
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
    </div>
  );
}
