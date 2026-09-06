import React, { useRef } from "react";
import { X, Printer, Download, ShieldCheck, FileText, CheckCircle2 } from "lucide-react";
import { Claim } from "../../../lib/claimsStore";
import Button from "../ui/Button";

interface CMS1500ModalProps {
  claim: Claim | null;
  isOpen: boolean;
  onClose: () => void;
}

export default function CMS1500Modal({ claim, isOpen, onClose }: CMS1500ModalProps) {
  const printRef = useRef<HTMLDivElement>(null);

  if (!isOpen || !claim) return null;

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadJson = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(claim, null, 2));
    const downloadAnchor = document.createElement("a");
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `${claim.claimNumber}_CMS1500.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  // Format date to MM DD YY or YYYY-MM-DD
  const formatDate = (dateStr?: string) => {
    if (!dateStr) return "";
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return dateStr;
      const mm = String(d.getMonth() + 1).padStart(2, "0");
      const dd = String(d.getDate()).padStart(2, "0");
      const yy = String(d.getFullYear()).slice(-2);
      return `${mm} ${dd} ${yy}`;
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="fixed inset-0 z-[1000] overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex justify-center p-2 sm:p-4 md:p-6 animate-in fade-in duration-200">
      <div className="relative w-full max-w-5xl bg-white rounded-2xl shadow-2xl border border-slate-200 flex flex-col my-auto max-h-[92vh] overflow-hidden">
        {/* Modal Top Bar */}
        <div className="px-6 py-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-red-50 border border-red-200 flex items-center justify-center text-red-600">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-slate-800" style={{ fontFamily: "Outfit, sans-serif" }}>
                  CMS-1500 Health Insurance Claim Form
                </h2>
                <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-red-100 text-red-700 border border-red-200">
                  Form 02/12
                </span>
                <span className="px-2 py-0.5 rounded-full text-xs font-mono font-medium bg-slate-200 text-slate-700">
                  {claim.claimNumber}
                </span>
              </div>
              <p className="text-xs text-slate-500">
                Payer: <span className="font-semibold text-slate-700">{claim.payer.name}</span> (EDI #{claim.payer.payerId})
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleDownloadJson}
              className="hidden sm:inline-flex items-center gap-1.5 text-xs text-slate-700"
            >
              <Download className="w-3.5 h-3.5" />
              Export JSON
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={handlePrint}
              className="inline-flex items-center gap-1.5 text-xs bg-red-600 hover:bg-red-700 text-white"
            >
              <Printer className="w-3.5 h-3.5" />
              Print CMS-1500
            </Button>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-200/60 transition-colors ml-1 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Scrollable Printable Form Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-slate-100">
          <div
            ref={printRef}
            className="bg-white max-w-4xl mx-auto p-6 sm:p-8 rounded-xl shadow-xs border border-red-200 text-slate-900 print:border-none print:shadow-none print:p-0 print:m-0"
            style={{ fontFamily: "'Inter', system-ui, sans-serif" }}
          >
            {/* Form Top Title */}
            <div className="border-b-2 border-red-600 pb-3 mb-4 flex justify-between items-start">
              <div>
                <p className="text-[11px] font-bold tracking-wider text-red-700 uppercase">
                  Health Insurance Claim Form
                </p>
                <p className="text-[9px] text-slate-500">
                  Approved by National Uniform Claim Committee (NUCC) 02/12
                </p>
              </div>
              <div className="text-right">
                <p className="text-[11px] font-mono font-bold text-slate-800">
                  PICA / OMB-0938-1197
                </p>
                <p className="text-[10px] text-slate-500 font-mono">
                  CLAIM ID: {claim.claimNumber}
                </p>
              </div>
            </div>

            {/* Carrier Information Box */}
            <div className="border border-slate-300 rounded-sm p-2 mb-3 bg-slate-50/50 flex justify-between text-xs">
              <div>
                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">
                  Carrier / Payer Name & Address
                </span>
                <p className="font-bold text-slate-800 text-sm">{claim.payer.name}</p>
                <p className="text-slate-600 text-[11px]">{claim.payer.address || "Payer Claims Department"}</p>
                <p className="text-[10px] text-slate-500">Payer ID: <span className="font-mono font-semibold">{claim.payer.payerId}</span></p>
              </div>
              <div className="text-right">
                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">
                  Program Type
                </span>
                <span className="inline-block mt-1 px-2 py-0.5 rounded text-[11px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                  {claim.payer.type}
                </span>
              </div>
            </div>

            {/* SECTION 1: Patient and Insured Information (Boxes 1-13) */}
            <div className="text-[10px] font-bold text-red-700 uppercase tracking-wider mb-1 bg-red-50/70 px-2 py-0.5 border-l-2 border-red-600">
              Patient and Insured Information (Boxes 1 - 13)
            </div>

            <div className="grid grid-cols-12 border border-slate-300 rounded-xs mb-4 text-xs divide-x divide-y divide-slate-300">
              {/* Box 1 */}
              <div className="col-span-6 p-2">
                <span className="text-[9px] font-bold text-red-600 block">1. MEDICARE / MEDICAID / TRICARE / GROUP HEALTH / OTHER</span>
                <div className="mt-1 flex gap-4 text-[11px]">
                  <label className="flex items-center gap-1">
                    <input type="radio" checked={claim.payer.type === "Medicare"} readOnly className="text-red-600" /> Medicare
                  </label>
                  <label className="flex items-center gap-1">
                    <input type="radio" checked={claim.payer.type === "Medicaid"} readOnly className="text-red-600" /> Medicaid
                  </label>
                  <label className="flex items-center gap-1">
                    <input type="radio" checked={claim.payer.type === "Commercial"} readOnly className="text-red-600" /> Group Health
                  </label>
                  <label className="flex items-center gap-1">
                    <input type="radio" checked={claim.payer.type === "Private"} readOnly className="text-red-600" /> Other
                  </label>
                </div>
              </div>

              {/* Box 1a */}
              <div className="col-span-6 p-2 bg-amber-50/30">
                <span className="text-[9px] font-bold text-red-600 block">1a. INSURED&apos;S I.D. NUMBER</span>
                <p className="font-mono font-bold text-slate-800 text-sm mt-0.5">{claim.insuredId}</p>
              </div>

              {/* Box 2 */}
              <div className="col-span-6 p-2">
                <span className="text-[9px] font-bold text-red-600 block">2. PATIENT&apos;S NAME (Last Name, First Name, Middle Initial)</span>
                <p className="font-semibold text-slate-800 mt-0.5">{claim.patientName}</p>
              </div>

              {/* Box 3 */}
              <div className="col-span-6 p-2">
                <div className="flex justify-between">
                  <div>
                    <span className="text-[9px] font-bold text-red-600 block">3. PATIENT&apos;S BIRTH DATE</span>
                    <p className="font-mono font-medium text-slate-800 mt-0.5">{formatDate(claim.patientDob) || "04/15/1992"}</p>
                  </div>
                  <div>
                    <span className="text-[9px] font-bold text-red-600 block">SEX</span>
                    <p className="font-semibold text-slate-800 mt-0.5">{claim.patientGender}</p>
                  </div>
                </div>
              </div>

              {/* Box 5 */}
              <div className="col-span-6 p-2">
                <span className="text-[9px] font-bold text-red-600 block">5. PATIENT&apos;S ADDRESS &amp; TELEPHONE</span>
                <p className="text-slate-800 text-[11px] mt-0.5">{claim.patientAddress || "742 Evergreen Terr, Springfield, IL"}</p>
                <p className="text-slate-600 text-[11px]">Tel: {claim.patientPhone || "(555) 123-4567"}</p>
              </div>

              {/* Box 4 & 7 */}
              <div className="col-span-6 p-2">
                <span className="text-[9px] font-bold text-red-600 block">4 &amp; 7. INSURED&apos;S NAME &amp; POLICY / GROUP</span>
                <p className="font-semibold text-slate-800 text-[11px] mt-0.5">{claim.patientName} (Self)</p>
                <p className="text-slate-600 text-[11px]">Group #: {claim.groupNumber || "GRP-STANDARD"}</p>
              </div>

              {/* Box 12 & 13 */}
              <div className="col-span-6 p-2">
                <span className="text-[9px] font-bold text-red-600 block">12. PATIENT&apos;S OR AUTHORIZED PERSON&apos;S SIGNATURE</span>
                <p className="font-mono text-emerald-700 font-bold text-[11px] mt-1 flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3 inline" /> SIGNATURE ON FILE (SOF)
                </p>
                <span className="text-[9px] text-slate-400 block">Date: {claim.serviceDate}</span>
              </div>

              <div className="col-span-6 p-2">
                <span className="text-[9px] font-bold text-red-600 block">13. INSURED&apos;S OR AUTHORIZED PERSON&apos;S SIGNATURE</span>
                <p className="font-mono text-emerald-700 font-bold text-[11px] mt-1 flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3 inline" /> SIGNATURE ON FILE (SOF)
                </p>
                <span className="text-[9px] text-slate-400 block">Authorized Assignment of Benefits</span>
              </div>
            </div>

            {/* SECTION 2: Physician or Supplier Information (Boxes 14-33) */}
            <div className="text-[10px] font-bold text-red-700 uppercase tracking-wider mb-1 bg-red-50/70 px-2 py-0.5 border-l-2 border-red-600">
              Physician or Supplier Information (Boxes 14 - 33)
            </div>

            {/* Box 21: Diagnosis Codes */}
            <div className="border border-slate-300 rounded-xs p-2 mb-3">
              <div className="flex justify-between items-center mb-1">
                <span className="text-[9px] font-bold text-red-600 uppercase">
                  21. DIAGNOSIS OR NATURE OF ILLNESS OR INJURY (ICD-10-CM Codes &amp; Pointers)
                </span>
                <span className="text-[9px] font-mono text-slate-500">ICD Ind: 0 (ICD-10)</span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                {claim.diagnosisCodes.map((diag) => (
                  <div key={diag.pointer} className="p-1.5 bg-slate-50 rounded border border-slate-200">
                    <div className="flex items-center gap-1.5">
                      <span className="w-4 h-4 rounded-full bg-red-100 text-red-700 text-[10px] font-bold flex items-center justify-center">
                        {diag.pointer}
                      </span>
                      <span className="font-mono font-bold text-slate-800 text-xs">{diag.code}</span>
                    </div>
                    <p className="text-[10px] text-slate-500 truncate mt-0.5" title={diag.description}>
                      {diag.description}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            {/* Box 24: Service Lines */}
            <div className="border border-slate-300 rounded-xs mb-3 overflow-x-auto">
              <div className="bg-red-50/50 p-1.5 border-b border-slate-300 text-[9px] font-bold text-red-700 uppercase tracking-wider">
                24. Service Lines (CPT / HCPCS, Modifiers, Diagnosis Pointer, Charges, Units)
              </div>
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-300 text-[9px] text-slate-600 font-bold uppercase tracking-wider">
                    <th className="p-1.5 border-r border-slate-200">24A. Dates of Service</th>
                    <th className="p-1.5 border-r border-slate-200 text-center">24B. POS</th>
                    <th className="p-1.5 border-r border-slate-200">24D. CPT / HCPCS &amp; Modifiers</th>
                    <th className="p-1.5 border-r border-slate-200 text-center">24E. Diag Pointer</th>
                    <th className="p-1.5 border-r border-slate-200 text-right">24F. $ Charges</th>
                    <th className="p-1.5 border-r border-slate-200 text-center">24G. Units</th>
                    <th className="p-1.5 text-right">24J. Rendering NPI</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 text-xs">
                  {claim.lines.map((line, idx) => (
                    <tr key={line.id || idx} className="hover:bg-slate-50/60">
                      <td className="p-2 border-r border-slate-200 font-mono text-[11px] whitespace-nowrap">
                        {formatDate(line.serviceDate)} - {formatDate(line.serviceDate)}
                      </td>
                      <td className="p-2 border-r border-slate-200 text-center font-mono text-xs">
                        {claim.placeOfService.split(" ")[0]}
                      </td>
                      <td className="p-2 border-r border-slate-200">
                        <div className="flex items-center gap-1.5">
                          <span className="font-mono font-bold text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded text-xs">
                            {line.cptCode}
                          </span>
                          {line.modifier && (
                            <span className="font-mono text-[10px] text-slate-500 bg-slate-100 px-1 rounded">
                              {line.modifier}
                            </span>
                          )}
                          <span className="text-[11px] text-slate-700 truncate max-w-xs">{line.description}</span>
                        </div>
                      </td>
                      <td className="p-2 border-r border-slate-200 text-center font-bold font-mono text-xs text-red-700">
                        {line.diagnosisPointer}
                      </td>
                      <td className="p-2 border-r border-slate-200 text-right font-mono font-semibold text-slate-900">
                        ${line.chargeAmount.toFixed(2)}
                      </td>
                      <td className="p-2 border-r border-slate-200 text-center font-mono text-xs">
                        {line.units}
                      </td>
                      <td className="p-2 text-right font-mono text-[11px] text-slate-600">
                        {claim.renderingProviderNpi}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Boxes 25-33: Financials & Providers */}
            <div className="grid grid-cols-12 border border-slate-300 rounded-xs text-xs divide-x divide-y divide-slate-300">
              <div className="col-span-4 p-2">
                <span className="text-[9px] font-bold text-red-600 block">25. FEDERAL TAX I.D. NUMBER</span>
                <p className="font-mono font-semibold text-slate-800 mt-0.5">{claim.billingProviderTaxId || "XX-XXX4912"}</p>
              </div>

              <div className="col-span-4 p-2">
                <span className="text-[9px] font-bold text-red-600 block">26. PATIENT&apos;S ACCOUNT NO.</span>
                <p className="font-mono text-slate-800 mt-0.5">{claim.patientId}</p>
              </div>

              <div className="col-span-4 p-2">
                <span className="text-[9px] font-bold text-red-600 block">27. ACCEPT ASSIGNMENT?</span>
                <p className="font-bold text-emerald-700 mt-0.5">YES</p>
              </div>

              <div className="col-span-4 p-2 bg-slate-50/50">
                <span className="text-[9px] font-bold text-red-600 block">28. TOTAL CHARGE</span>
                <p className="text-base font-bold font-mono text-slate-900 mt-0.5">${claim.totalCharge.toFixed(2)}</p>
              </div>

              <div className="col-span-4 p-2">
                <span className="text-[9px] font-bold text-red-600 block">29. AMOUNT PAID</span>
                <p className="text-sm font-semibold font-mono text-slate-700 mt-0.5">${claim.amountPaid.toFixed(2)}</p>
              </div>

              <div className="col-span-4 p-2">
                <span className="text-[9px] font-bold text-red-600 block">30. BALANCE DUE</span>
                <p className="text-sm font-semibold font-mono text-slate-700 mt-0.5">
                  ${Math.max(0, claim.totalCharge - claim.amountPaid - (claim.contractualAdjustment || 0)).toFixed(2)}
                </p>
              </div>

              <div className="col-span-4 p-2">
                <span className="text-[9px] font-bold text-red-600 block">31. SIGNATURE OF PHYSICIAN</span>
                <p className="font-semibold text-slate-800 text-[11px] mt-0.5">{claim.renderingProviderName}</p>
                <p className="text-[10px] text-slate-500 font-mono">Date: {claim.serviceDate}</p>
              </div>

              <div className="col-span-4 p-2">
                <span className="text-[9px] font-bold text-red-600 block">32. SERVICE FACILITY LOCATION</span>
                <p className="font-semibold text-slate-800 text-[11px] mt-0.5">{claim.billingProviderName}</p>
                <p className="text-[10px] text-slate-500">{claim.placeOfService}</p>
              </div>

              <div className="col-span-4 p-2 bg-amber-50/20">
                <span className="text-[9px] font-bold text-red-600 block">33. BILLING PROVIDER INFO &amp; PH #</span>
                <p className="font-semibold text-slate-800 text-[11px] mt-0.5">{claim.billingProviderName}</p>
                <p className="text-[10px] text-slate-600">{claim.billingProviderAddress}</p>
                <p className="text-[10px] font-mono text-slate-700 font-semibold mt-0.5">
                  NPI: {claim.billingProviderNpi}
                </p>
              </div>
            </div>

            {/* Electronic Clearinghouse Stamp */}
            {claim.submissionMethod === "clearinghouse" && claim.clearinghouseTrackingId && (
              <div className="mt-4 p-3 rounded-lg border border-emerald-200 bg-emerald-50/60 flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                  <div>
                    <span className="font-semibold text-emerald-900">Mantra Clearinghouse Electronic Gateway</span>
                    <p className="text-[11px] text-emerald-700">
                      EDI 837P ANSI ASC X12 Transmitted &bull; Tracking: <span className="font-mono font-bold">{claim.clearinghouseTrackingId}</span>
                    </p>
                  </div>
                </div>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold font-mono bg-emerald-100 text-emerald-800 border border-emerald-300">
                  EDI ACK 999 VALIDATED
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3 border-t border-slate-200 bg-slate-50 flex items-center justify-between shrink-0">
          <p className="text-xs text-slate-500">
            Official CMS-1500 (02/12) Paper &amp; Electronic Standard Format
          </p>
          <Button variant="outline" size="sm" onClick={onClose}>
            Close
          </Button>
        </div>
      </div>
    </div>
  );
}
