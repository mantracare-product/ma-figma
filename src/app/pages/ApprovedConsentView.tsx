import React, { useState } from "react";
import { useParams, Link } from "react-router";
import {
  Building2,
  ChevronDown,
  ChevronUp,
  FileText,
  Calendar,
  Clock,
  ShieldCheck,
  ArrowLeft,
  CheckCircle2,
  Lock,
} from "lucide-react";
import { abdmService } from "../services/abdmService";

export default function ApprovedConsentView() {
  const { consentId } = useParams<{ consentId: string }>();
  const consents = abdmService.getConsents();
  const consent = consents.find((c) => c.id === consentId) || consents[0];

  // Request Accordion items expansion state
  const [expandedItems, setExpandedItems] = useState<string[]>([
    "visit-1",
    "visit-2",
    "doc-1",
  ]);

  const toggleExpand = (id: string) => {
    setExpandedItems((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const isoTimestamp = consent
    ? `2026-09-08T07:41:53.107Z`
    : new Date().toISOString();

  return (
    <div className="min-h-screen bg-slate-50 p-6 md:p-12 text-slate-800 select-none">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Top Navigation Bar / Context */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              ABDM Consent Verification Engine
            </span>
          </div>
          <div className="flex items-center gap-2 text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-3 py-1 rounded-full">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span>Patient Authorized Consent Artefact</span>
          </div>
        </div>

        {/* ── Main Approved Consent Container (Reference Screenshot C) ── */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 items-start">
          {/* Left Pill: Requesting Healthcare Facility */}
          <div className="lg:col-span-1">
            <div className="bg-[#1456f0] text-white px-5 py-3.5 rounded-2xl shadow-md shadow-blue-500/15 font-bold text-sm tracking-tight flex items-center justify-between">
              <span>Eye Mantra Hospital Pvt Ltd (3)</span>
            </div>
          </div>

          {/* Right Box: Consent Request Card */}
          <div className="lg:col-span-3 bg-white rounded-2xl border border-slate-200/90 shadow-2xs overflow-hidden">
            {/* Header: Consent Request (Timestamp) */}
            <div className="p-5 border-b border-slate-100">
              <h3 className="text-sm font-bold text-slate-900 font-display">
                Consent Request ({isoTimestamp})
              </h3>
            </div>

            {/* Requests Section */}
            <div className="p-5 space-y-3">
              <span className="text-xs font-bold text-slate-600 block">
                Requests:
              </span>

              {/* Accordion List matching Reference Screenshot */}
              <div className="border border-slate-200/80 rounded-2xl overflow-hidden divide-y divide-slate-100">
                {/* Item 1: Patient visit - 08 Sept 2026 */}
                <div>
                  <div
                    onClick={() => toggleExpand("visit-1")}
                    className="p-4 flex items-center justify-between bg-white hover:bg-slate-50/70 transition-colors cursor-pointer text-xs font-medium text-slate-800"
                  >
                    <span>Patient visit - 08 Sept 2026</span>
                    {expandedItems.includes("visit-1") ? (
                      <ChevronUp className="w-4 h-4 text-slate-400" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-slate-400" />
                    )}
                  </div>
                  {expandedItems.includes("visit-1") && (
                    <div className="p-4 bg-slate-50/50 text-xs text-slate-600 space-y-2 border-t border-slate-100">
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <span className="text-[10px] text-slate-400 font-bold uppercase block">Encounter</span>
                          <span className="font-semibold text-slate-900">OP Consultation (Ophthalmology)</span>
                        </div>
                        <div>
                          <span className="text-[10px] text-slate-400 font-bold uppercase block">Doctor</span>
                          <span className="font-semibold text-slate-900">Dr. Vivek Sharma (MS)</span>
                        </div>
                        <div>
                          <span className="text-[10px] text-slate-400 font-bold uppercase block">Diagnosis</span>
                          <span className="font-semibold text-slate-900">Refractive Error & Astigmatism</span>
                        </div>
                        <div>
                          <span className="text-[10px] text-slate-400 font-bold uppercase block">Status</span>
                          <span className="text-emerald-600 font-bold flex items-center gap-1">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            Approved & Shared via FHIR
                          </span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Item 2: Patient visit - 08 Sept 2026 */}
                <div>
                  <div
                    onClick={() => toggleExpand("visit-2")}
                    className="p-4 flex items-center justify-between bg-white hover:bg-slate-50/70 transition-colors cursor-pointer text-xs font-medium text-slate-800"
                  >
                    <span>Patient visit - 08 Sept 2026</span>
                    {expandedItems.includes("visit-2") ? (
                      <ChevronUp className="w-4 h-4 text-slate-400" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-slate-400" />
                    )}
                  </div>
                  {expandedItems.includes("visit-2") && (
                    <div className="p-4 bg-slate-50/50 text-xs text-slate-600 space-y-2 border-t border-slate-100">
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <span className="text-[10px] text-slate-400 font-bold uppercase block">Care Context</span>
                          <span className="font-semibold text-slate-900">Diagnostic Retina Scan & Topography</span>
                        </div>
                        <div>
                          <span className="text-[10px] text-slate-400 font-bold uppercase block">Facility</span>
                          <span className="font-semibold text-slate-900">Eye Mantra Diagnostic Wing</span>
                        </div>
                        <div className="col-span-2">
                          <span className="text-[10px] text-slate-400 font-bold uppercase block">Notes</span>
                          <span className="font-semibold text-slate-900">Corneal curvature within normal limits. Prescribed corrective lenses.</span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Item 3: Health Document */}
                <div>
                  <div
                    onClick={() => toggleExpand("doc-1")}
                    className="p-4 flex items-center justify-between bg-white hover:bg-slate-50/70 transition-colors cursor-pointer text-xs font-medium text-slate-800"
                  >
                    <span>Health Document</span>
                    {expandedItems.includes("doc-1") ? (
                      <ChevronUp className="w-4 h-4 text-slate-400" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-slate-400" />
                    )}
                  </div>
                  {expandedItems.includes("doc-1") && (
                    <div className="p-4 bg-slate-50/50 text-xs text-slate-600 space-y-2 border-t border-slate-100">
                      <div className="flex items-center justify-between">
                        <div>
                          <span className="font-bold text-slate-900 block">Digital Prescription & Bill Slip</span>
                          <span className="text-[11px] text-slate-500">PDF Document • 420 KB • HL7 FHIR Encrypted</span>
                        </div>
                        <span className="px-2.5 py-1 rounded-lg bg-blue-50 text-[#1456f0] font-bold text-[11px] border border-blue-200">
                          Verified Bundle
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
