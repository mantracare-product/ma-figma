import React, { useState } from "react";
import {
  FileText,
  Activity,
  HardDrive,
  Eye,
  RefreshCw,
  Inbox,
  ArrowRight,
  DownloadCloud,
} from "lucide-react";
import {
  abdmService,
  ABHAPatientRecord,
  ConsentRecord,
} from "../../../services/abdmService";
import { RequestConsentModal } from "./RequestConsentModal";
import { GetRecordsModal } from "./GetRecordsModal";
import { MilestoneHero } from "../MilestoneHero";
import { toast } from "sonner";

export const M3Dashboard: React.FC = () => {
  const records = abdmService.getRecords();
  const [selectedPatient, setSelectedPatient] = useState<ABHAPatientRecord | null>(
    records.length > 0 ? records[0] : null
  );

  // Consents State
  const [consents, setConsents] = useState<ConsentRecord[]>(() =>
    abdmService.getConsents()
  );

  // Modals state
  const [showRequestConsentModal, setShowRequestConsentModal] = useState(false);
  const [showGetRecordsModal, setShowGetRecordsModal] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const patientName = selectedPatient?.name || "Jasmine";

  const refreshData = () => {
    setIsRefreshing(true);
    setTimeout(() => {
      setConsents(abdmService.getConsents());
      setIsRefreshing(false);
      toast.success("Consent requests updated");
    }, 400);
  };

  const handleSimulateApprove = async (consentId: string) => {
    await abdmService.approveConsent(consentId);
    setConsents(abdmService.getConsents());
    toast.success("Patient approved consent! Records are now accessible.");
  };

  const handleViewApprovedConsentInNewTab = (consentId: string) => {
    window.open(`/consent-view/${consentId}`, "_blank");
  };

  return (
    <div className="space-y-6">
      {/* ── M3 Hero Header: Exact Style from M2 Reference ── */}
      <MilestoneHero
        badge="MILESTONE 3 · REQUEST CONSENT AND MEDICAL RECORDS"
        networkTag="HIU Gateway & Consent Manager"
        title="Request consent & medical records"
        description="Request the patient's consent, then fetch their medical records shared from other healthcare facilities."
      />

      {/* ── M3 Header Bar: Medical Records + Both Actions [ Request Consent ] & [ Request Record ] ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200/80">
        <div className="flex items-center gap-3">
          <div>
            <div className="flex items-center gap-2">
              <h2
                className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2"
                style={{ fontFamily: "Outfit, sans-serif" }}
              >
                <span>Refresh Records</span>
                <button
                  type="button"
                  onClick={refreshData}
                  className={`text-[#1456f0] hover:text-[#1147cc] transition-transform ${
                    isRefreshing ? "animate-spin" : ""
                  }`}
                  title="Refresh status"
                >
                  <RefreshCw className="w-4 h-4" />
                </button>
              </h2>
            </div>
          </div>
        </div>

        {/* Both Actions in M3 Header: [ Request Record ] & [ Request Consent ] */}
        <div className="flex items-center gap-2.5">
          <div className="hidden sm:flex items-center gap-1.5 text-[11px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200/80 px-2.5 py-1 rounded-full">
            <HardDrive className="w-3 h-3 text-emerald-600" />
            <span>Storage: <strong>3.8 MB</strong></span>
          </div>

          <button
            type="button"
            onClick={() => setShowGetRecordsModal(true)}
            className="h-10 px-3.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-bold text-xs flex items-center gap-2 shadow-2xs transition-colors cursor-pointer"
          >
            <DownloadCloud className="w-3.5 h-3.5 text-slate-500" />
            <span>Request Record</span>
          </button>

          <button
            type="button"
            onClick={() => setShowRequestConsentModal(true)}
            className="h-10 px-4 rounded-xl bg-[#1456f0] hover:bg-[#1147cc] text-white font-bold text-xs flex items-center gap-2 shadow-xs shadow-blue-500/20 active:scale-[0.99] transition-all cursor-pointer"
          >
            <span>Request Consent</span>
            <FileText className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* ── Sub Navigation Tabs Bar: [ Request Consent ] ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-3">
        <div className="flex items-center gap-6 text-xs font-bold">
          <button
            type="button"
            className="flex items-center gap-2 pb-1.5 transition-all text-slate-900 border-b-2 border-slate-900 font-display relative cursor-pointer"
          >
            <FileText className="w-4 h-4 text-[#1456f0]" />
            <span>Request Consent</span>
          </button>
        </div>

        <div className="text-xs text-slate-500 font-medium">
          Active Consent Artifacts ({consents.length})
        </div>
      </div>

      {/* ── SECTION: REQUEST CONSENT & APPROVED HEALTH RECORDS TABLE ── */}
      <div className="space-y-4">
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/70 border-b border-slate-200/80 text-[11px] font-extrabold uppercase tracking-wider text-slate-500">
                  <th className="py-3.5 px-5">Consent ID</th>
                  <th className="py-3.5 px-5">Requested On</th>
                  <th className="py-3.5 px-5">Last Updated</th>
                  <th className="py-3.5 px-5">Shared For</th>
                  <th className="py-3.5 px-5">Expires In</th>
                  <th className="py-3.5 px-5">Status</th>
                  <th className="py-3.5 px-5 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
                {consents.length > 0 ? (
                  consents.map((consent) => {
                    const isApproved = consent.status === "GRANTED";
                    return (
                      <tr
                        key={consent.id}
                        className="hover:bg-slate-50/70 transition-colors"
                      >
                        <td className="py-4 px-5 font-mono text-xs text-slate-600 font-medium">
                          {consent.id}
                        </td>
                        <td className="py-4 px-5">
                          <div className="text-xs">
                            <span className="font-bold text-slate-900 block">
                              {consent.requestedOn?.split("\n")[0] || "08 Sept 26"}
                            </span>
                            <span className="text-[11px] text-slate-400">
                              {consent.requestedOn?.split("\n")[1] || "01:05 pm"}
                            </span>
                          </div>
                        </td>
                        <td className="py-4 px-5">
                          <div className="text-xs">
                            <span className="font-bold text-slate-900 block">
                              {consent.lastUpdated?.split("\n")[0] || "08 Sept 26"}
                            </span>
                            <span className="text-[11px] text-slate-400">
                              {consent.lastUpdated?.split("\n")[1] || "01:05 pm"}
                            </span>
                          </div>
                        </td>
                        <td className="py-4 px-5 text-slate-700 font-medium">
                          {consent.sharedFor || "184 Days"}
                        </td>
                        <td className="py-4 px-5">
                          <div>
                            <span className="font-bold text-emerald-600 block">
                              {consent.expiresIn?.split("\n")[0] || "180 days"}
                            </span>
                            <span className="text-[11px] text-slate-400">
                              {consent.expiresIn?.split("\n")[1] || "08 Mar 27"}
                            </span>
                          </div>
                        </td>
                        <td className="py-4 px-5">
                          {isApproved ? (
                            <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-3 py-0.5 rounded-full inline-flex items-center gap-1">
                              Success
                            </span>
                          ) : (
                            <span
                              onClick={() => handleSimulateApprove(consent.id)}
                              title="Click to simulate patient approval"
                              className="text-[11px] font-bold text-amber-700 bg-amber-50 border border-amber-200 px-3 py-0.5 rounded-full inline-flex items-center gap-1 cursor-pointer hover:bg-amber-100 transition-colors"
                            >
                              Pending
                            </span>
                          )}
                        </td>
                        <td className="py-4 px-5 text-right font-medium">
                          {isApproved ? (
                            <button
                              type="button"
                              onClick={() =>
                                handleViewApprovedConsentInNewTab(consent.id)
                              }
                              className="px-3.5 py-1.5 rounded-xl bg-blue-50 text-[#1456f0] hover:bg-[#1456f0] hover:text-white font-bold text-xs inline-flex items-center gap-1 transition-all cursor-pointer shadow-2xs"
                            >
                              <Eye className="w-3.5 h-3.5" />
                              <span>View</span>
                            </button>
                          ) : (
                            <span className="text-slate-400 font-bold">-</span>
                          )}
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={7} className="py-20 text-center space-y-3">
                      <div className="w-16 h-16 rounded-3xl bg-slate-100 text-slate-400 mx-auto flex items-center justify-center">
                        <Inbox className="w-8 h-8 stroke-[1.5]" />
                      </div>
                      <p className="text-xs font-semibold text-slate-600">
                        No consent requests found. Click "Request Consent" to initiate health record access.
                      </p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* ── Active Request Consent Modal ── */}
      <RequestConsentModal
        isOpen={showRequestConsentModal}
        onClose={() => setShowRequestConsentModal(false)}
        onSuccess={() => {
          setConsents(abdmService.getConsents());
        }}
        onCheckStatus={() => {
          setConsents(abdmService.getConsents());
        }}
        patient={selectedPatient}
      />

      {/* ── Active Request Record / Get Records Modal ── */}
      <GetRecordsModal
        isOpen={showGetRecordsModal}
        onClose={() => setShowGetRecordsModal(false)}
        onRequestConsent={() => {
          setShowGetRecordsModal(false);
          setShowRequestConsentModal(true);
        }}
      />
    </div>
  );
};
