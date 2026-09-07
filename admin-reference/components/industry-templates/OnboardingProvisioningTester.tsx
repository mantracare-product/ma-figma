"use client";

import React, { useState } from "react";
import { useIndustryTemplateStore } from "@/lib/industry-template-store";
import { IndustryStarterBundle, ProvisionedWorkspace, ProvisioningStepLog } from "@/lib/types/industry-templates";
import { GlassCard } from "@/components/ui/GlassCard";
import { Pill } from "@/components/ui/Pill";
import {
  Building2,
  Sparkles,
  CheckCircle2,
  PhoneCall,
  CheckSquare,
  FileCode,
  SlidersHorizontal,
  ArrowRight,
  RotateCcw,
  Loader2,
  ShieldCheck,
  Zap,
  Globe,
  Bot,
} from "lucide-react";

export const OnboardingProvisioningTester: React.FC = () => {
  const { categories, bundles, simulateProvisioning } = useIndustryTemplateStore();

  const [currentStep, setCurrentStep] = useState<1 | 2 | 3 | 4 | 5>(1);

  // Form State
  const [orgName, setOrgName] = useState("Horizon Dental Studio");
  const [subdomain, setSubdomain] = useState("horizon-dental");
  const [adminEmail, setAdminEmail] = useState("dr.miller@horizondental.com");
  const [selectedCategory, setSelectedCategory] = useState(categories[0]?.name || "Healthcare & Medical");
  const [selectedBundleId, setSelectedBundleId] = useState(bundles[0]?.id || "bundle-dental");

  // Provisioning Logs State
  const [isProvisioning, setIsProvisioning] = useState(false);
  const [provisioningLogs, setProvisioningLogs] = useState<ProvisioningStepLog[]>([]);
  const [provisionedResult, setProvisionedResult] = useState<ProvisionedWorkspace | null>(null);

  // Active bundle
  const activeBundle = bundles.find((b) => b.id === selectedBundleId) || bundles[0];

  // Filtered bundles by category
  const filteredBundles = bundles.filter((b) => b.categoryName === selectedCategory);

  const handleStartProvisioning = async () => {
    setCurrentStep(4);
    setIsProvisioning(true);
    setProvisioningLogs([]);

    try {
      const result = await simulateProvisioning(
        orgName,
        subdomain,
        selectedBundleId,
        (stepLog) => {
          setProvisioningLogs((prev) => {
            const existing = prev.findIndex((l) => l.step === stepLog.step);
            if (existing >= 0) {
              const updated = [...prev];
              updated[existing] = stepLog;
              return updated;
            }
            return [...prev, stepLog];
          });
        }
      );
      setProvisionedResult(result);
      setIsProvisioning(false);
      setCurrentStep(5);
    } catch (err) {
      console.error(err);
      setIsProvisioning(false);
      alert("Provisioning encountered an error. Rollback safety triggered.");
    }
  };

  const handleReset = () => {
    setCurrentStep(1);
    setIsProvisioning(false);
    setProvisioningLogs([]);
    setProvisionedResult(null);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Simulation Stepper Header */}
      <div className="p-4 rounded-3xl bg-white/70 border border-slate-200/80 backdrop-blur-md shadow-xs">
        <div className="flex items-center justify-between overflow-x-auto gap-2 custom-scrollbar">
          {[
            { step: 1, label: "1. Tenant Signup" },
            { step: 2, label: "2. Vertical Selection" },
            { step: 3, label: "3. Starter Pack Preview" },
            { step: 4, label: "4. Database Seeding" },
            { step: 5, label: "5. Workspace Ready" },
          ].map((s) => {
            const isDone = currentStep > s.step;
            const isCurrent = currentStep === s.step;
            return (
              <div
                key={s.step}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                  isCurrent
                    ? "bg-[#181e25] text-white shadow-xs"
                    : isDone
                    ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                    : "text-slate-400"
                }`}
              >
                <div
                  className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-bold ${
                    isDone ? "bg-emerald-500 text-white" : isCurrent ? "bg-blue-500 text-white" : "bg-slate-200 text-slate-500"
                  }`}
                >
                  {isDone ? "✓" : s.step}
                </div>
                <span>{s.label}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* STEP 1: USER SIGNUP & ORG REGISTRATION */}
      {currentStep === 1 && (
        <GlassCard variant="default" rounded="3xl" padding="xl" className="max-w-2xl mx-auto space-y-6">
          <div className="border-b border-slate-100 pb-3 space-y-1">
            <h3 className="font-display font-bold text-lg text-[#181e25] flex items-center gap-2">
              <Building2 className="w-5 h-5 text-[#1456f0]" />
              Step 1: Tenant Organization & Subdomain Registration
            </h3>
            <p className="text-xs text-slate-500">
              Simulating the new customer registration modal on MantraAssist signup page.
            </p>
          </div>

          <div className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                Company / Practice Name
              </label>
              <input
                type="text"
                value={orgName}
                onChange={(e) => {
                  setOrgName(e.target.value);
                  setSubdomain(
                    e.target.value
                      .toLowerCase()
                      .replace(/[^a-z0-9]+/g, "-")
                      .replace(/^-+|-+$/g, "")
                  );
                }}
                className="w-full px-4 py-2.5 text-xs sm:text-sm bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#1456f0]/40 outline-none"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                Dedicated Subdomain
              </label>
              <div className="flex items-center">
                <input
                  type="text"
                  value={subdomain}
                  onChange={(e) => setSubdomain(e.target.value)}
                  className="w-full px-4 py-2.5 text-xs sm:text-sm bg-white border border-r-0 border-slate-200 rounded-l-xl font-mono text-[#1456f0] outline-none"
                />
                <span className="px-3.5 py-2.5 text-xs bg-slate-100 border border-slate-200 rounded-r-xl text-slate-500 font-mono">
                  .mantraassist.ai
                </span>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                Admin Work Email
              </label>
              <input
                type="email"
                value={adminEmail}
                onChange={(e) => setAdminEmail(e.target.value)}
                className="w-full px-4 py-2.5 text-xs sm:text-sm bg-white border border-slate-200 rounded-xl outline-none"
              />
            </div>
          </div>

          <div className="pt-4 flex justify-end">
            <Pill
              variant="navy"
              size="md"
              icon={<ArrowRight className="w-4 h-4" />}
              onClick={() => setCurrentStep(2)}
            >
              Continue to Vertical Selection
            </Pill>
          </div>
        </GlassCard>
      )}

      {/* STEP 2: INDUSTRY VERTICAL SELECTION */}
      {currentStep === 2 && (
        <GlassCard variant="default" rounded="3xl" padding="xl" className="max-w-3xl mx-auto space-y-6">
          <div className="border-b border-slate-100 pb-3 space-y-1">
            <h3 className="font-display font-bold text-lg text-[#181e25] flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-amber-500" />
              Step 2: Select Your Industry Category & Niche
            </h3>
            <p className="text-xs text-slate-500">
              The platform will immediately compile a turnkey Starter Pack pre-configured for your operations.
            </p>
          </div>

          {/* Categories Grid */}
          <div className="space-y-2">
            <label className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              1. Macro Vertical Category
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {categories.map((cat) => (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => {
                    setSelectedCategory(cat.name);
                    const match = bundles.find((b) => b.categoryName === cat.name);
                    if (match) setSelectedBundleId(match.id);
                  }}
                  className={`p-3 rounded-2xl border text-left transition-all ${
                    selectedCategory === cat.name
                      ? "bg-[#1456f0] text-white border-transparent shadow-md"
                      : "bg-white hover:bg-slate-50 border-slate-200 text-slate-700"
                  }`}
                >
                  <span className="font-bold text-xs block">{cat.name}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Specific Sub-Industries */}
          <div className="space-y-2 pt-2">
            <label className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              2. Specific Niche / Business Model
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {filteredBundles.map((b) => (
                <div
                  key={b.id}
                  onClick={() => setSelectedBundleId(b.id)}
                  className={`p-4 rounded-2xl border cursor-pointer transition-all ${
                    selectedBundleId === b.id
                      ? "bg-blue-50/90 border-[#1456f0] ring-2 ring-[#1456f0]/20 shadow-sm"
                      : "bg-white hover:bg-slate-50 border-slate-200"
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <h4 className="font-bold text-sm text-[#181e25]">{b.industryName}</h4>
                    <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded bg-white text-slate-600 border">
                      v{b.version}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500">
                    Recommended AI Tone: <span className="italic">{b.recommendedTone}</span>
                  </p>
                </div>
              ))}
            </div>
          </div>

          <div className="pt-4 flex items-center justify-between border-t border-slate-100">
            <Pill variant="ghost" size="md" onClick={() => setCurrentStep(1)}>
              Back
            </Pill>
            <Pill
              variant="navy"
              size="md"
              icon={<ArrowRight className="w-4 h-4" />}
              onClick={() => setCurrentStep(3)}
            >
              Review Turnkey Starter Pack
            </Pill>
          </div>
        </GlassCard>
      )}

      {/* STEP 3: STARTER PACK PREVIEW */}
      {currentStep === 3 && (
        <GlassCard variant="default" rounded="3xl" padding="xl" className="max-w-3xl mx-auto space-y-6">
          <div className="border-b border-slate-100 pb-3 space-y-1">
            <div className="flex items-center justify-between">
              <h3 className="font-display font-bold text-lg text-[#181e25] flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-emerald-600" />
                Step 3: Starter Pack Pre-Flight Inspection
              </h3>
              <span className="text-xs font-mono font-bold px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                100% Ready
              </span>
            </div>
            <p className="text-xs text-slate-500">
              Reviewing auto-provisioning payload for <strong className="text-slate-700">{orgName}</strong> ({activeBundle.industryName})
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Process blueprint */}
            <div className="p-4 rounded-2xl bg-white border border-slate-200 space-y-2">
              <div className="flex items-center gap-2">
                <PhoneCall className="w-4 h-4 text-blue-600" />
                <h4 className="font-bold text-xs text-[#181e25] uppercase tracking-wider">
                  Process Workflow Blueprint
                </h4>
              </div>
              <p className="font-semibold text-xs text-slate-700">{activeBundle.processTemplate.name}</p>
              <ul className="text-[11px] text-slate-500 space-y-1 list-disc list-inside">
                {activeBundle.processTemplate.stages.map((stg) => (
                  <li key={stg.id}>{stg.name}</li>
                ))}
              </ul>
            </div>

            {/* Web Forms */}
            <div className="p-4 rounded-2xl bg-white border border-slate-200 space-y-2">
              <div className="flex items-center gap-2">
                <CheckSquare className="w-4 h-4 text-emerald-600" />
                <h4 className="font-bold text-xs text-[#181e25] uppercase tracking-wider">
                  Web Forms ({activeBundle.formTemplates.length})
                </h4>
              </div>
              <ul className="text-[11px] text-slate-600 space-y-1">
                {activeBundle.formTemplates.map((f) => (
                  <li key={f.id} className="truncate">
                    • <strong>{f.title}</strong>
                  </li>
                ))}
              </ul>
            </div>

            {/* KB Docs */}
            <div className="p-4 rounded-2xl bg-white border border-slate-200 space-y-2">
              <div className="flex items-center gap-2">
                <FileCode className="w-4 h-4 text-purple-600" />
                <h4 className="font-bold text-xs text-[#181e25] uppercase tracking-wider">
                  Knowledge Base ({activeBundle.documentTemplates.length} Docs)
                </h4>
              </div>
              <ul className="text-[11px] text-slate-600 space-y-1">
                {activeBundle.documentTemplates.map((d) => (
                  <li key={d.id} className="truncate">
                    • {d.title}
                  </li>
                ))}
              </ul>
            </div>

            {/* Services & Fields */}
            <div className="p-4 rounded-2xl bg-white border border-slate-200 space-y-2">
              <div className="flex items-center gap-2">
                <SlidersHorizontal className="w-4 h-4 text-amber-600" />
                <h4 className="font-bold text-xs text-[#181e25] uppercase tracking-wider">
                  Default Services & CRM Fields
                </h4>
              </div>
              <p className="text-xs text-slate-600">
                {activeBundle.defaultServices.length} Services ({activeBundle.defaultServices.map((s) => s.name).slice(0, 2).join(", ")}...)
              </p>
              <p className="text-xs text-slate-600">
                {activeBundle.customFields.length} Custom CRM Properties
              </p>
            </div>
          </div>

          <div className="pt-4 flex items-center justify-between border-t border-slate-100">
            <Pill variant="ghost" size="md" onClick={() => setCurrentStep(2)}>
              Back
            </Pill>
            <Pill
              variant="navy"
              size="md"
              icon={<Zap className="w-4 h-4 text-amber-400" />}
              onClick={handleStartProvisioning}
            >
              Execute Atomic Workspace Provisioning
            </Pill>
          </div>
        </GlassCard>
      )}

      {/* STEP 4: ATOMIC PROVISIONING SIMULATION ANIMATION */}
      {currentStep === 4 && (
        <GlassCard variant="default" rounded="3xl" padding="xl" className="max-w-2xl mx-auto space-y-6">
          <div className="text-center space-y-2 py-4">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#181e25] to-[#2c3e50] text-white flex items-center justify-center mx-auto shadow-md">
              <Loader2 className="w-6 h-6 text-blue-400 animate-spin" />
            </div>
            <h3 className="font-display font-bold text-lg text-[#181e25]">
              Cloning & Seeding Tenant Workspace...
            </h3>
            <p className="text-xs text-slate-500">
              Executing atomic database transactions with rollback safety mechanisms.
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-slate-900 text-slate-200 space-y-3 font-mono text-xs shadow-inner">
            {provisioningLogs.map((log) => (
              <div key={log.id} className="flex items-start gap-2.5 animate-in fade-in">
                {log.status === "completed" ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                ) : (
                  <Loader2 className="w-4 h-4 text-blue-400 shrink-0 animate-spin mt-0.5" />
                )}
                <div>
                  <span className={log.status === "completed" ? "text-emerald-300 font-semibold" : "text-white"}>
                    Step {log.step}: {log.title}
                  </span>
                  {log.details && (
                    <span className="block text-[11px] text-slate-400 mt-0.5">{log.details}</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </GlassCard>
      )}

      {/* STEP 5: DASHBOARD READY & TEST CALL SIMULATOR */}
      {currentStep === 5 && provisionedResult && (
        <GlassCard variant="default" rounded="3xl" padding="xl" className="max-w-3xl mx-auto space-y-6 animate-in zoom-in-95 duration-200">
          <div className="flex items-start justify-between border-b border-slate-100 pb-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-emerald-500 text-white flex items-center justify-center font-bold text-lg shadow-md">
                ✓
              </div>
              <div>
                <h3 className="font-display font-bold text-xl text-[#181e25]">
                  Workspace Successfully Provisioned!
                </h3>
                <p className="text-xs text-slate-500">
                  Tenant <strong className="text-slate-700">{provisionedResult.orgName}</strong> is fully initialized and live.
                </p>
              </div>
            </div>

            <Pill variant="ghost" size="sm" icon={<RotateCcw className="w-3.5 h-3.5" />} onClick={handleReset}>
              Run Another Test
            </Pill>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3.5 rounded-2xl bg-slate-50 border text-center">
              <span className="text-xs text-slate-400 uppercase font-semibold block">Domain</span>
              <span className="font-bold text-xs text-[#1456f0] truncate block mt-0.5">
                {provisionedResult.subdomain}.mantraassist.ai
              </span>
            </div>
            <div className="p-3.5 rounded-2xl bg-slate-50 border text-center">
              <span className="text-xs text-slate-400 uppercase font-semibold block">Stages Cloned</span>
              <span className="font-bold text-sm text-[#181e25] block mt-0.5">
                {provisionedResult.clonedStagesCount} Linear Stages
              </span>
            </div>
            <div className="p-3.5 rounded-2xl bg-slate-50 border text-center">
              <span className="text-xs text-slate-400 uppercase font-semibold block">Forms Deployed</span>
              <span className="font-bold text-sm text-[#181e25] block mt-0.5">
                {provisionedResult.clonedFormsCount} Live Forms
              </span>
            </div>
            <div className="p-3.5 rounded-2xl bg-slate-50 border text-center">
              <span className="text-xs text-slate-400 uppercase font-semibold block">KB Indexed</span>
              <span className="font-bold text-sm text-[#181e25] block mt-0.5">
                {provisionedResult.clonedDocsCount} Docs Loaded
              </span>
            </div>
          </div>

          {/* Interactive AI Receptionist Test Call Box */}
          <div className="p-5 rounded-3xl bg-gradient-to-br from-[#181e25] to-[#2c3e50] text-white shadow-xl space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Bot className="w-5 h-5 text-blue-400" />
                <span className="font-bold text-sm">Live AI Receptionist Test Simulator</span>
              </div>
              <span className="text-[10px] font-mono bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded-full border border-emerald-400/30">
                Ready for Test Call
              </span>
            </div>

            <div className="p-4 rounded-2xl bg-white/10 backdrop-blur-md border border-white/10 space-y-2">
              <span className="text-[11px] font-mono text-blue-300 uppercase block font-semibold">
                AI Opening Greeting Script:
              </span>
              <p className="text-xs text-slate-100 italic leading-relaxed">
                "{(activeBundle.processTemplate.stages[0]?.systemInstruction || activeBundle.processTemplate.stages[0]?.basic?.greetingPhrase || "Hello, thank you for calling {{business_name}}.").replace(/{{business_name}}/g, provisionedResult.orgName).replace(/{{client_name}}/g, "Alex")}"
              </p>
            </div>

            <div className="flex items-center justify-between pt-2">
              <span className="text-xs text-slate-300">
                AI Model: <strong className="text-white">{activeBundle.processTemplate.globalSettings.aiModel}</strong> • Voice Speed: <strong className="text-white">{activeBundle.processTemplate.globalSettings.voiceSpeed}x</strong>
              </span>
              <button
                type="button"
                onClick={() => alert(`Connecting simulated test call to ${provisionedResult.orgName} AI Receptionist!`)}
                className="px-4 py-2 rounded-full bg-[#1456f0] hover:bg-blue-600 text-white font-bold text-xs shadow-md transition-all flex items-center gap-2"
              >
                <PhoneCall className="w-3.5 h-3.5" />
                Start Test Call
              </button>
            </div>
          </div>
        </GlassCard>
      )}
    </div>
  );
};
