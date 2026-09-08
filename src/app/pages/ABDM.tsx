import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  ShieldCheck,
  Plus,
  Search,
  Download,
  CheckCircle2,
  Clock,
  Sparkles,
  CreditCard,
  AtSign,
  Phone,
  Fingerprint,
  UserCheck,
  Coins,
  ArrowRight,
  Filter,
  FileSpreadsheet,
  ExternalLink,
  ChevronRight,
  Lock,
  Unlock,
  Building,
  Link2,
  History,
  FileText,
} from "lucide-react";
import { abdmService, ABHAPatientRecord } from "../services/abdmService";
import { ABDMUnlockModal } from "../components/abdm/ABDMUnlockModal";
import { MandatoryABHASetup } from "../components/abdm/MandatoryABHASetup";
import { ABDMAuthCard } from "../components/abdm/ABDMAuthCard";
import { CreateABHAModal } from "../components/abdm/CreateABHAModal";
import { VerifyABHAModal } from "../components/abdm/VerifyABHAModal";
import { ABHACardModal } from "../components/abdm/ABHACardModal";
import { ABDMKnowledgeCenter } from "../components/abdm/ABDMKnowledgeCenter";
import { PatientSelfServiceCard } from "../components/abdm/PatientSelfServiceCard";
import { MilestoneHero } from "../components/abdm/MilestoneHero";
import { M2Dashboard } from "../components/abdm/m2/M2Dashboard";
import { M3Dashboard } from "../components/abdm/m3/M3Dashboard";

import abdmLogo from "../../assets/abdm/abdm-logo.f4a16ac5b7650b3a70033e233e6122e0.svg";
import nhaLogo from "../../assets/abdm/NHA.b7adfb67b258bee7ddf57b57969e2749.svg";
import mantraLogo from "../../assets/abdm/logo.png";
import { toast } from "sonner";

export default function ABDM() {
  const [activeTab, setActiveTab] = useState<"m1" | "m2" | "m3">("m1");
  const [isUnlocked, setIsUnlocked] = useState(() => abdmService.isUnlocked());
  const [isUnlocking, setIsUnlocking] = useState(false);
  const [isAbhaVerified, setIsAbhaVerified] = useState(() => abdmService.isAbhaVerified());
  const [records, setRecords] = useState<ABHAPatientRecord[]>(() => abdmService.getRecords());
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"ALL" | "LINKED" | "VERIFIED">("ALL");

  // Modals state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showVerifyModal, setShowVerifyModal] = useState(false);
  const [showCardModal, setShowCardModal] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [selectedPatientForCard, setSelectedPatientForCard] = useState<ABHAPatientRecord | null>(null);

  useEffect(() => {
    const handleUpdate = () => {
      setRecords(abdmService.getRecords());
    };
    const handleVerificationUpdate = () => {
      setIsAbhaVerified(abdmService.isAbhaVerified());
    };
    window.addEventListener("abdm_records_updated", handleUpdate);
    window.addEventListener("abdm_verification_updated", handleVerificationUpdate);
    return () => {
      window.removeEventListener("abdm_records_updated", handleUpdate);
      window.removeEventListener("abdm_verification_updated", handleVerificationUpdate);
    };
  }, []);

  const handleUnlock = () => {
    setIsUnlocking(true);
    setTimeout(() => {
      abdmService.setUnlocked(true);
      setIsUnlocked(true);
      setIsUnlocking(false);
      toast.success("ABDM Module unlocked successfully!");
    }, 600);
  };

  const handleOpenCard = (patient: ABHAPatientRecord) => {
    setSelectedPatientForCard(patient);
    setShowCardModal(true);
  };

  const filteredRecords = records.filter((r) => {
    const matchesSearch =
      r.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.abhaNumber.includes(searchQuery) ||
      r.abhaAddress.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.mobile.includes(searchQuery);

    const matchesStatus = statusFilter === "ALL" || r.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const totalLinked = records.filter((r) => r.status === "LINKED").length;
  const totalIncentive = records.reduce((sum, r) => sum + (r.dhisIncentiveEarned || 0), 0);

  return (
    <div className="relative min-h-[calc(100vh-64px)] p-6 md:p-8 max-w-7xl mx-auto space-y-7">
      {/* ── First Gate: Unlock ABDM Modal if not unlocked ── */}
      <AnimatePresence>
        {!isUnlocked && (
          <ABDMUnlockModal onUnlock={handleUnlock} isLoading={isUnlocking} />
        )}
      </AnimatePresence>

      {/* ── Second Gate: Mandatory ABHA Verification / Creation ── */}
      {isUnlocked && !isAbhaVerified && (
        <MandatoryABHASetup
          onComplete={(patient) => {
            setIsAbhaVerified(true);
            setRecords(abdmService.getRecords());
          }}
          onOpenCardModal={(patient) => handleOpenCard(patient)}
        />
      )}

      {/* ── Third Stage: ABDM Workspace (Accessible ONLY when Unlocked AND ABHA Verified) ── */}
      {isUnlocked && isAbhaVerified && (
        <div>
          {/* Page Top Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200/80">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-[#1456f0] text-white flex items-center justify-center shadow-md shadow-blue-500/20">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1
                  className="text-2xl font-bold text-slate-900 tracking-tight"
                  style={{ fontFamily: "Outfit, sans-serif" }}
                >
                  ABDM / ABHA
                </h1>
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-[#1456f0] bg-blue-50 border border-blue-200 px-2 py-0.5 rounded-md">
                  M1 + M2 + M3 Connected
                </span>
              </div>
              <p className="text-xs font-medium text-slate-500 mt-0.5">
                Ayushman Bharat Digital Mission Complete Healthcare Exchange Platform
              </p>
            </div>
          </div>

          {/* Top Quick CTA Buttons */}
          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={() => setShowAuthModal(true)}
              className="h-10 px-3.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-bold text-xs flex items-center gap-2 shadow-2xs transition-colors cursor-pointer"
            >
              <Lock className="w-3.5 h-3.5 text-slate-500" />
              <span>HPR ID Auth</span>
            </button>

            <button
              type="button"
              onClick={() => setShowVerifyModal(true)}
              className="h-10 px-4 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-bold text-xs flex items-center gap-2 transition-colors cursor-pointer shadow-2xs"
            >
              <UserCheck className="w-4 h-4 text-[#1456f0]" />
              <span>Verify ABHA</span>
            </button>

            <button
              type="button"
              onClick={() => setShowCreateModal(true)}
              className="h-10 px-4 rounded-xl bg-[#1456f0] hover:bg-[#1147cc] text-white font-bold text-xs flex items-center gap-2 shadow-xs shadow-blue-500/20 active:scale-[0.99] transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Create ABHA</span>
            </button>
          </div>
        </div>

          {/* ── Milestone Segmented Tab Navigation ── */}
        <div className="bg-slate-100 p-1.5 rounded-2xl flex flex-col sm:flex-row items-center gap-1.5 border border-slate-200/80 mt-4">
          <button
            type="button"
            onClick={() => setActiveTab("m1")}
            className={`w-full sm:flex-1 py-3 px-4 rounded-xl text-xs font-bold transition-all flex items-center justify-between cursor-pointer ${
              activeTab === "m1"
                ? "bg-white text-slate-900 shadow-sm border border-slate-200/60 font-display"
                : "text-slate-500 hover:text-slate-800"
            }`}
          >
            <div className="flex items-center gap-2.5">
              <CreditCard className={`w-4 h-4 flex-shrink-0 ${activeTab === "m1" ? "text-[#1456f0]" : "text-slate-500"}`} />
              <div className="text-left">
                <span className="block font-bold leading-tight">M1 • Create & verify ABHA</span>
                <span className="text-[10px] font-normal text-slate-400 block">Creation and Verification (ABHA)</span>
              </div>
            </div>
            <span className="text-[9px] font-extrabold uppercase text-slate-600 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded-md">
              Available
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("m2")}
            className={`w-full sm:flex-1 py-3 px-4 rounded-xl text-xs font-bold transition-all flex items-center justify-between cursor-pointer ${
              activeTab === "m2"
                ? "bg-white text-slate-900 shadow-sm border border-slate-200/60 font-display"
                : "text-slate-500 hover:text-slate-800"
            }`}
          >
            <div className="flex items-center gap-2.5">
              <Link2 className={`w-4 h-4 flex-shrink-0 ${activeTab === "m2" ? "text-[#1456f0]" : "text-slate-500"}`} />
              <div className="text-left">
                <span className="block font-bold leading-tight">M2 • Link prescription & reports</span>
                <span className="text-[10px] font-normal text-slate-400 block">Link Records</span>
              </div>
            </div>
            <span className="text-[9px] font-extrabold uppercase text-slate-600 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded-md">
              Available
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("m3")}
            className={`w-full sm:flex-1 py-3 px-4 rounded-xl text-xs font-bold transition-all flex items-center justify-between cursor-pointer ${
              activeTab === "m3"
                ? "bg-white text-slate-900 shadow-sm border border-slate-200/60 font-display"
                : "text-slate-500 hover:text-slate-800"
            }`}
          >
            <div className="flex items-center gap-2.5">
              <History className={`w-4 h-4 flex-shrink-0 ${activeTab === "m3" ? "text-[#1456f0]" : "text-slate-500"}`} />
              <div className="text-left">
                <span className="block font-bold leading-tight">M3 • Request consent & medical records</span>
                <span className="text-[10px] font-normal text-slate-400 block">Request Consent and Medical Records</span>
              </div>
            </div>
            <span className="text-[9px] font-extrabold uppercase text-slate-600 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded-md">
              Available
            </span>
          </button>
        </div>

        {/* ── TAB CONTENT ── */}
        {activeTab === "m1" && (
          <div className="space-y-6 pt-2">
            {/* ── M1 Hero Header: Exact Style from M2 Reference ── */}
            <MilestoneHero
              badge="MILESTONE 1 · CREATION AND VERIFICATION (ABHA)"
              networkTag="ABHA Identity System"
              title="Create & verify ABHA"
              description="Create or verify the patient's ABHA to securely link and exchange health records."
            />

            {/* ── ABDM Indicator Cards (M1, M2, M3) ── */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* CARD 1 — M1 (ABHA Patients) */}
              <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-2xs relative overflow-hidden flex flex-col justify-between">
                {/* Large Background Milestone Watermark */}
                <span className="text-slate-100 font-extrabold text-7xl select-none absolute right-4 top-1 pointer-events-none leading-none">
                  M1
                </span>

                <div className="relative z-10 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="w-8 h-8 rounded-xl bg-blue-50 text-[#1456f0] flex items-center justify-center shadow-2xs">
                      <CreditCard className="w-4 h-4" />
                    </div>
                    <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200/80 px-2 py-0.5 rounded-md">
                      +{records.length || 2}
                    </span>
                  </div>

                  <div>
                    <div className="flex items-baseline justify-between">
                      <span className="text-3xl font-bold text-slate-900 font-display">
                        {records.length || 2}
                      </span>
                    </div>
                    <div className="flex items-center justify-between mt-0.5">
                      <span className="text-xs font-bold text-slate-700 font-display">
                        ABHA Patients
                      </span>
                      <button
                        type="button"
                        onClick={() => setActiveTab("m1")}
                        className="text-[11px] font-semibold text-[#1456f0] hover:underline flex items-center gap-0.5 cursor-pointer"
                      >
                        What is M1? →
                      </button>
                    </div>
                  </div>

                  {/* Progress Bar (100% KYC) */}
                  <div className="space-y-1.5 pt-1">
                    <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                      <div className="h-full bg-[#1456f0] rounded-full w-full" />
                    </div>
                    <div className="flex items-center justify-between text-[11px] font-semibold text-slate-500">
                      <span className="flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#1456f0]" />
                        KYC {records.length || 2}
                      </span>
                      <span className="flex items-center gap-1 text-slate-400">
                        <span className="w-1.5 h-1.5 rounded-full bg-slate-300" />
                        Non-KYC 0
                      </span>
                    </div>
                  </div>
                </div>

                {/* Contextual Box */}
                <div className="mt-4 pt-3 border-t border-slate-100">
                  <div className="bg-rose-50/70 border border-rose-100 rounded-xl px-3 py-2 text-[11px] text-rose-800 font-medium leading-relaxed">
                    Still early. Every patient you register adds to this count.
                  </div>
                </div>
              </div>

              {/* CARD 2 — M2 (Records Linked) */}
              <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-2xs relative overflow-hidden flex flex-col justify-between">
                {/* Large Background Milestone Watermark */}
                <span className="text-slate-100 font-extrabold text-7xl select-none absolute right-4 top-1 pointer-events-none leading-none">
                  M2
                </span>

                <div className="relative z-10 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="w-8 h-8 rounded-xl bg-blue-50 text-[#1456f0] flex items-center justify-center shadow-2xs">
                      <Link2 className="w-4 h-4" />
                    </div>
                    <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200/80 px-2 py-0.5 rounded-md">
                      +{totalLinked || 7}
                    </span>
                  </div>

                  <div>
                    <div className="flex items-baseline justify-between">
                      <span className="text-3xl font-bold text-slate-900 font-display">
                        {totalLinked || 7}
                      </span>
                    </div>
                    <div className="flex items-center justify-between mt-0.5">
                      <span className="text-xs font-bold text-slate-700 font-display">
                        Records Linked
                      </span>
                      <button
                        type="button"
                        onClick={() => setActiveTab("m2")}
                        className="text-[11px] font-semibold text-[#1456f0] hover:underline flex items-center gap-0.5 cursor-pointer"
                      >
                        What is M2? →
                      </button>
                    </div>
                  </div>

                  {/* Progress Bar (100% KYC) */}
                  <div className="space-y-1.5 pt-1">
                    <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                      <div className="h-full bg-[#1456f0] rounded-full w-full" />
                    </div>
                    <div className="flex items-center justify-between text-[11px] font-semibold text-slate-500">
                      <span className="flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#1456f0]" />
                        KYC {totalLinked || 7}
                      </span>
                      <span className="flex items-center gap-1 text-slate-400">
                        <span className="w-1.5 h-1.5 rounded-full bg-slate-300" />
                        Non-KYC 0
                      </span>
                    </div>
                  </div>
                </div>

                {/* Contextual Box */}
                <div className="mt-4 pt-3 border-t border-slate-100">
                  <div className="bg-emerald-50/70 border border-emerald-100 rounded-xl px-3 py-2 text-[11px] text-emerald-800 font-medium leading-relaxed">
                    Great progress! Health records are actively linked to ABHA.
                  </div>
                </div>
              </div>

              {/* CARD 3 — M3 (Consent Requests) */}
              <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-2xs relative overflow-hidden flex flex-col justify-between">
                {/* Large Background Milestone Watermark */}
                <span className="text-slate-100 font-extrabold text-7xl select-none absolute right-4 top-1 pointer-events-none leading-none">
                  M3
                </span>

                <div className="relative z-10 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="w-8 h-8 rounded-xl bg-blue-50 text-[#1456f0] flex items-center justify-center shadow-2xs">
                      <FileText className="w-4 h-4" />
                    </div>
                    <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200/80 px-2 py-0.5 rounded-md">
                      +1
                    </span>
                  </div>

                  <div>
                    <div className="flex items-baseline justify-between">
                      <span className="text-3xl font-bold text-slate-900 font-display">
                        1
                      </span>
                    </div>
                    <div className="flex items-center justify-between mt-0.5">
                      <span className="text-xs font-bold text-slate-700 font-display">
                        Consent Requests
                      </span>
                      <button
                        type="button"
                        onClick={() => setActiveTab("m3")}
                        className="text-[11px] font-semibold text-[#1456f0] hover:underline flex items-center gap-0.5 cursor-pointer"
                      >
                        What is M3? →
                      </button>
                    </div>
                  </div>

                  {/* Progress Bar (0% KYC / 100% Non-KYC) */}
                  <div className="space-y-1.5 pt-1">
                    <div className="w-full h-1.5 bg-slate-200 rounded-full overflow-hidden">
                      <div className="h-full bg-slate-400 rounded-full w-full" />
                    </div>
                    <div className="flex items-center justify-between text-[11px] font-semibold text-slate-500">
                      <span className="flex items-center gap-1 text-slate-400">
                        <span className="w-1.5 h-1.5 rounded-full bg-slate-300" />
                        KYC 0
                      </span>
                      <span className="flex items-center gap-1 text-slate-700">
                        <span className="w-1.5 h-1.5 rounded-full bg-slate-500" />
                        Non-KYC 1
                      </span>
                    </div>
                  </div>
                </div>

                {/* Contextual Box */}
                <div className="mt-4 pt-3 border-t border-slate-100">
                  <div className="bg-rose-50/70 border border-rose-100 rounded-xl px-3 py-2 text-[11px] text-rose-800 font-medium leading-relaxed">
                    Low volume. Raising more requests earns extra incentive.
                  </div>
                </div>
              </div>
            </div>

            {/* 3 Primary M1 Action Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              {/* Card 1: Create ABHA */}
              <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-2xs hover:shadow-md transition-all duration-200 flex flex-col sm:flex-row sm:items-center gap-4 group">
                <div className="space-y-2.5 flex-1 min-w-0">
                  <div className="w-9 h-9 rounded-xl bg-blue-50 text-[#1456f0] flex items-center justify-center shadow-2xs group-hover:scale-105 transition-transform">
                    <Plus className="w-5 h-5" />
                  </div>
                  <h3 className="text-base font-bold text-slate-900 font-display">
                    Create ABHA Number
                  </h3>
                  <p className="text-xs text-slate-500 leading-relaxed">
                    Create a new ABHA number using Aadhaar OTP.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowCreateModal(true)}
                  className="w-full sm:w-auto sm:min-w-[118px] h-10 px-3 rounded-xl bg-[#1456f0] hover:bg-[#1147cc] text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-xs shadow-blue-500/20 active:scale-[0.99] transition-all cursor-pointer shrink-0"
                >
                  <span>Create ABHA</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Card 2: Verify ABHA */}
              <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-2xs hover:shadow-md transition-all duration-200 flex flex-col sm:flex-row sm:items-center gap-4 group">
                <div className="space-y-2.5 flex-1 min-w-0">
                  <div className="w-9 h-9 rounded-xl bg-blue-50 text-[#1456f0] flex items-center justify-center shadow-2xs group-hover:scale-105 transition-transform">
                    <UserCheck className="w-5 h-5" />
                  </div>
                  <h3 className="text-base font-bold text-slate-900 font-display">
                    Verify ABHA
                  </h3>
                  <p className="text-xs text-slate-500 leading-relaxed">
                    Verify an existing ABHA number or ABHA address.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowVerifyModal(true)}
                  className="w-full sm:w-auto sm:min-w-[118px] h-10 px-3 rounded-xl bg-gradient-to-r from-[#181e25] to-[#2c3e50] hover:from-[#222a35] hover:to-[#384c60] text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-xs active:scale-[0.99] transition-all cursor-pointer shrink-0"
                >
                  <span>Verify ABHA</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Card 3: Download Card */}
              <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-2xs hover:shadow-md transition-all duration-200 flex flex-col sm:flex-row sm:items-center gap-4 group">
                <div className="space-y-2.5 flex-1 min-w-0">
                  <div className="w-9 h-9 rounded-xl bg-blue-50 text-[#1456f0] flex items-center justify-center shadow-2xs group-hover:scale-105 transition-transform">
                    <CreditCard className="w-5 h-5" />
                  </div>
                  <h3 className="text-base font-bold text-slate-900 font-display">
                    ABHA Card
                  </h3>
                  <p className="text-xs text-slate-500 leading-relaxed">
                    View or download the patient's ABHA card.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    if (records.length > 0) {
                      handleOpenCard(records[0]);
                    } else {
                      toast.info("Create or verify an ABHA identity first");
                    }
                  }}
                  className="w-full sm:w-auto sm:min-w-[118px] h-10 px-3 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold text-xs flex items-center justify-center gap-1.5 shadow-2xs active:scale-[0.99] transition-all cursor-pointer shrink-0"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download Card</span>
                </button>
              </div>
            </div>

            {/* ── PATIENT SELF-SERVICE: Scan & Share QR (Directly above Learn ABDM) ── */}
            <PatientSelfServiceCard />

            {/* ── KNOWLEDGE CENTER: Learn ABDM (Milestones, Glossary, FAQ) replacing Patient Records card ── */}
            <ABDMKnowledgeCenter
              onNavigateM1Create={() => setShowCreateModal(true)}
              onNavigateM2Link={() => setActiveTab("m2")}
              onNavigateM3Fetch={() => setActiveTab("m3")}
              activePatient={records.length > 0 ? records[0] : null}
            />
          </div>
        )}

        {/* M2 TAB CONTENT */}
        {activeTab === "m2" && <M2Dashboard />}

        {/* M3 TAB CONTENT */}
        {activeTab === "m3" && <M3Dashboard />}

        {/* Strictly 3 Branding Badges Footer */}
        <div className="p-4 bg-slate-50/50 rounded-2xl border border-slate-200/80 flex items-center justify-between px-6 mt-6">
          <div className="flex items-center gap-6">
            {/* 1. MantraAssist Logo */}
            <img
              src={mantraLogo}
              alt="MantraAssist"
              className="h-5 w-auto object-contain"
            />

            {/* 2. ABDM Badge */}
            <img
              src={abdmLogo}
              alt="ABDM"
              className="h-5 w-auto object-contain"
            />

            {/* 3. National Health Authority Badge */}
            <img
              src={nhaLogo}
              alt="National Health Authority"
              className="h-5 w-auto object-contain"
            />
          </div>
          <p className="text-[11px] text-slate-400 font-medium">
            National Health Authority (NHA) ABDM Milestone 1, 2 & 3 Certified Architecture
          </p>
        </div>
      </div>
      )}

      {/* ── Active Modals ── */}
      <CreateABHAModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSuccess={(rec) => {
          setRecords(abdmService.getRecords());
        }}
        onOpenCard={(rec) => handleOpenCard(rec)}
      />

      <VerifyABHAModal
        isOpen={showVerifyModal}
        onClose={() => setShowVerifyModal(false)}
        onVerified={(rec) => {
          setRecords(abdmService.getRecords());
        }}
        onOpenCard={(rec) => handleOpenCard(rec)}
      />

      <ABHACardModal
        isOpen={showCardModal}
        onClose={() => setShowCardModal(false)}
        patient={selectedPatientForCard}
      />

      {showAuthModal && (
        <ABDMAuthCard
          onSuccess={() => {
            setShowAuthModal(false);
          }}
          onCancel={() => setShowAuthModal(false)}
        />
      )}
    </div>
  );
}
