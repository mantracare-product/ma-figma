import React, { useState } from "react";
import { Outlet } from "react-router";
import RevenueCycleSubnav from "./RevenueCycleSubnav";
import { HowItWorksButton, HowItWorksModal } from "../help/HowItWorksModal";

export default function RevenueCycleLayout() {
  const [showHelp, setShowHelp] = useState(false);

  return (
    <div className="min-h-full bg-[#F8FAFC] p-6 lg:p-8 overflow-y-auto" style={{ fontFamily: "DM Sans, sans-serif" }}>
      <div className="max-w-[1500px] mx-auto space-y-6">
        {/* Top Header - Exact match to Settings Screenshot */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-3">
              <h1
                className="text-3xl font-bold text-[#1e293b] tracking-tight"
                style={{ fontFamily: "Outfit, sans-serif" }}
              >
                Revenue Cycle
              </h1>
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider bg-blue-50 text-blue-700 border border-blue-200/80 font-mono">
                RCM ENGINE
              </span>
            </div>
            <p className="text-sm text-slate-500 font-normal leading-relaxed">
              Configure claims adjudication, clearinghouse scrubbing, denial triage, and patient responsibility
            </p>
          </div>

          <div className="flex items-center gap-2">
            <HowItWorksButton
              label="How it works"
              onClick={() => setShowHelp(true)}
            />
          </div>
        </div>

        {/* 2-Column Canvas Layout */}
        <div className="flex gap-6 items-start">
          {/* Left Floating Subnav Pill Card */}
          <RevenueCycleSubnav />

          {/* Right Main Content Outlet */}
          <div className="flex-1 min-w-0">
            <Outlet />
          </div>
        </div>
      </div>

      <HowItWorksModal
        isOpen={showHelp}
        onClose={() => setShowHelp(false)}
        title="How Revenue Cycle Works"
        summary="MantraAssist RCM automates the end-to-end revenue cycle from completed clinical visits to electronic 837P claims, clearinghouse scrubbing, denial clustering, payment posting, and patient statements."
        bullets={[
          "Track A to Track B Seam: Completed appointments automatically generate billable encounters. When documentation is signed, an electronic 837P claim is created.",
          "Pre-Submission Scrubbing: AI rules evaluate Timely Filing limits, NPI enrollments, and LCD medical necessity policies before claims are transmitted.",
          "Denial Management: Adjudicated denials are grouped into CARC/RARC clusters with AI root-cause analysis and human-reviewed appeal draft letters.",
          "Patient Responsibility Sequencing: Statements are strictly blocked from patient delivery until active payer denials are resolved or written off.",
        ]}
      />
    </div>
  );
}
