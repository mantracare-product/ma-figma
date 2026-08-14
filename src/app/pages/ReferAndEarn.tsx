// ReferAndEarn.tsx
import React, { useState } from "react";
import {
  Gift,
  Copy,
  Check,
  Users,
  DollarSign,
  TrendingUp,
  Award,
  Search,
  Info,
  ChevronDown,
  ArrowRight,
  ArrowLeft,
  HelpCircle,
  PackageCheck,
  Share2,
} from "lucide-react";
import { toast } from "sonner";
import PageHeader from "../components/layout/PageHeader";
import { HowItWorksButton } from "../components/help/HowItWorksModal";
import ReferralShareDrawer from "../components/refer-earn/ReferralShareDrawer";
import { ReferralShareTarget } from "../components/refer-earn/referralShareTypes";

type PlanTier = "Starter" | "Growth" | "Scale" | "Enterprise";

interface ReferralRecord {
  id: string;
  name: string;
  contact: string;
  date: string;
  plan: PlanTier;
  status: "paid" | "pending" | "signed_up";
  rate: string;
  reward: number;
}

const PLANS: PlanTier[] = ["Starter", "Growth", "Scale", "Enterprise"];

const PLAN_RATES: Record<PlanTier, string> = {
  Starter: "14%",
  Growth: "12%",
  Scale: "10%",
  Enterprise: "7%",
};

const MOCK_REFERRALS: ReferralRecord[] = [
  { id: "ref-1", name: "Dr. Marcus Vance", contact: "marcus.v@healthclinic.org", date: "Jul 24, 2026", plan: "Scale", status: "paid", rate: "10%", reward: 59.8 },
  { id: "ref-2", name: "Elena Rostova", contact: "+1 (555) 342-9911", date: "Jul 22, 2026", plan: "Growth", status: "paid", rate: "12%", reward: 29.8 },
  { id: "ref-3", name: "Apex Dental Group", contact: "billing@apexdental.com", date: "Jul 18, 2026", plan: "Scale", status: "pending", rate: "10%", reward: 59.8 },
  { id: "ref-4", name: "Jonathan Miller", contact: "j.miller@medpractice.io", date: "Jul 15, 2026", plan: "Starter", status: "signed_up", rate: "14%", reward: 9.8 },
  { id: "ref-5", name: "Sophia Reynolds", contact: "+1 (555) 887-1200", date: "Jul 10, 2026", plan: "Enterprise", status: "paid", rate: "7%", reward: 119.8 },
  { id: "ref-6", name: "Summit Wellness", contact: "contact@summitwellness.com", date: "Jul 02, 2026", plan: "Growth", status: "paid", rate: "12%", reward: 29.8 },
];

const FAQ_ITEMS = [
  {
    q: "What counts as a successful referral?",
    a: "When a referred practice signs up via your link and upgrades to any paid plan.",
  },
  {
    q: "When and how do I get paid?",
    a: "Commission payouts hit your account balance within 24 hours of payment confirmation.",
  },
  {
    q: "Is there a limit on how much I can earn?",
    a: "No, referral rewards are uncapped across all plan tiers.",
  },
  {
    q: "How does my referral get their 15% discount?",
    a: "Their 15% discount is automatically applied at checkout when using your link or code.",
  },
];

export default function ReferAndEarn() {
  const [activeTab, setActiveTab] = useState<"overview" | "referrals">("overview");

  // Selected plan state & derived link details
  const [selectedPlan, setSelectedPlan] = useState<PlanTier>("Starter");
  const [isCopied, setIsCopied] = useState(false);
  const [shareTarget, setShareTarget] = useState<ReferralShareTarget | null>(null);

  const currentLink = `https://mantraassist.com/signup?ref=MANTRA-ALEX2026&plan=${selectedPlan.toLowerCase()}`;
  const currentCode = `MANTRA-${selectedPlan.toUpperCase()}`;
  const currentRate = PLAN_RATES[selectedPlan];

  // Table filter state
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "paid" | "pending" | "signed_up">("all");

  // FAQ Accordion state
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(0);

  const handleCopyCurrentLink = () => {
    navigator.clipboard.writeText(currentLink);
    setIsCopied(true);
    toast.success(`Referral link for ${selectedPlan} (${currentRate}) copied!`);
    setTimeout(() => setIsCopied(false), 2000);
  };

  const handleOpenShareDrawer = () => {
    setShareTarget({
      plan: selectedPlan,
      link: currentLink,
      code: currentCode,
      rate: currentRate,
    });
  };

  const filteredReferrals = MOCK_REFERRALS.filter((r) => {
    const matchesSearch =
      !searchQuery.trim() ||
      r.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.contact.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.plan.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus = statusFilter === "all" || r.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  return (
    <div className="min-h-screen bg-[#fafafa]">
      <div className="p-6 sm:p-8 max-w-7xl mx-auto space-y-6">
        {/* Page Header */}
        <PageHeader
          title="Refer & Earn"
          subtitle="Invite colleagues and healthcare practices to MantraAssist and earn recurring rewards"
          badge={
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider bg-blue-50 text-[#1456f0] border border-blue-200/60">
              Rewards
            </span>
          }
        >
          <HowItWorksButton onClick={() => setActiveTab("overview")} label="How Referrals Work" />
        </PageHeader>

        {/* Content Area (Full Width, No Sub-Sidebar) */}
        <main className="w-full space-y-8 min-w-0">
          {/* =========================================================================
              VIEW 1: OVERVIEW (Informational Program Brochure)
             ========================================================================= */}
          {activeTab === "overview" && (
            <div className="space-y-8">
              {/* Hero Banner */}
              <div
                className="rounded-xl p-6 md:p-8 text-white shadow-md space-y-4"
                style={{ backgroundColor: "#1F2937" }}
              >
                <div className="max-w-2xl space-y-2">
                  <h2 className="text-2xl md:text-3xl font-bold leading-tight" style={{ fontFamily: "DM Sans, sans-serif" }}>
                    Earn credits every time a practice signs up through you
                  </h2>
                  <p className="text-blue-50 text-sm leading-relaxed">
                    MantraAssist partner program rewards you for helping businesses double their growth — from converting every lead to bringing customers back.
                  </p>

                  <div className="pt-2">
                    <button
                      type="button"
                      onClick={() => setActiveTab("referrals")}
                      className="px-5 py-2.5 bg-white text-[#4F8EF7] hover:bg-blue-50 font-bold rounded-xl text-xs flex items-center gap-2 shadow-md transition-colors"
                      style={{ fontFamily: "DM Sans, sans-serif" }}
                    >
                      View My Referrals <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>

              {/* 3-Step Explainer */}
              <div className="bg-white border border-gray-200 p-6 md:p-8 rounded-xl space-y-6 shadow-sm">
                <div className="text-center max-w-xl mx-auto space-y-1">
                  <h3 className="text-xl font-bold text-[#020817]" style={{ fontFamily: "DM Sans, sans-serif" }}>
                    How Referral Rewards Work
                  </h3>
                  <p className="text-xs text-[#64748B]">
                    3 simple steps to earn recurring rewards for growing our healthcare automation network.
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="bg-gray-50/70 border border-gray-200/80 p-5 rounded-xl space-y-2">
                    <div className="w-7 h-7 rounded-full bg-[#E8F0FE] text-[#4F8EF7] flex items-center justify-center text-xs font-extrabold font-mono shrink-0">
                      1
                    </div>
                    <h4 className="text-sm font-bold text-[#020817]" style={{ fontFamily: "DM Sans, sans-serif" }}>
                      Select Plan & Share Link
                    </h4>
                    <p className="text-xs text-[#64748B]">
                      Pick a plan tier, get your unique link.
                    </p>
                  </div>

                  <div className="bg-gray-50/70 border border-gray-200/80 p-5 rounded-xl space-y-2">
                    <div className="w-7 h-7 rounded-full bg-[#E8F0FE] text-[#4F8EF7] flex items-center justify-center text-xs font-extrabold font-mono shrink-0">
                      2
                    </div>
                    <h4 className="text-sm font-bold text-[#020817]" style={{ fontFamily: "DM Sans, sans-serif" }}>
                      Friend Signs Up
                    </h4>
                    <p className="text-xs text-[#64748B]">
                      Your contact registers on any paid plan.
                    </p>
                  </div>

                  <div className="bg-gray-50/70 border border-gray-200/80 p-5 rounded-xl space-y-2">
                    <div className="w-7 h-7 rounded-full bg-[#E8F0FE] text-[#4F8EF7] flex items-center justify-center text-xs font-extrabold font-mono shrink-0">
                      3
                    </div>
                    <h4 className="text-sm font-bold text-[#020817]" style={{ fontFamily: "DM Sans, sans-serif" }}>
                      Earn Commission Rate
                    </h4>
                    <p className="text-xs text-[#64748B]">
                      Reward hits your balance within 24 hrs.
                    </p>
                  </div>
                </div>
              </div>

                {/* Commission by Plan Section (Compact Table) */}
                <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm space-y-4">
                  <div>
                    <h3 className="text-lg font-bold text-[#020817]" style={{ fontFamily: "DM Sans, sans-serif" }}>
                      Commission by Plan
                    </h3>
                    <p className="text-xs text-[#64748B] mt-0.5">
                      Your reward scales with the plan your referral signs up for — bigger accounts, bigger payouts.
                    </p>
                  </div>

                  <div className="overflow-x-auto border border-gray-100 rounded-xl">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-gray-50/80 text-[#64748B] font-semibold border-b border-gray-100">
                        <tr>
                          <th className="px-4 py-2.5">Plan Tier</th>
                          <th className="px-4 py-2.5">First Payment</th>
                          <th className="px-4 py-2.5">Commission Rate</th>
                          <th className="px-4 py-2.5 text-right">Estimated Payout</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        <tr className="hover:bg-gray-50/50">
                          <td className="px-4 py-2.5 font-bold text-[#020817]">Starter</td>
                          <td className="px-4 py-2.5 text-[#64748B]">₹6,999/mo</td>
                          <td className="px-4 py-2.5"><span className="font-semibold text-[#4F8EF7]">14% Rate</span></td>
                          <td className="px-4 py-2.5 text-right font-bold text-[#020817]">~₹980</td>
                        </tr>
                        <tr className="hover:bg-gray-50/50">
                          <td className="px-4 py-2.5 font-bold text-[#020817]">Growth</td>
                          <td className="px-4 py-2.5 text-[#64748B]">₹19,999/mo</td>
                          <td className="px-4 py-2.5"><span className="font-semibold text-[#4F8EF7]">12% Rate</span></td>
                          <td className="px-4 py-2.5 text-right font-bold text-[#020817]">~₹2,400</td>
                        </tr>
                        <tr className="hover:bg-gray-50/50">
                          <td className="px-4 py-2.5 font-bold text-[#020817]">Scale</td>
                          <td className="px-4 py-2.5 text-[#64748B]">₹44,999/mo</td>
                          <td className="px-4 py-2.5"><span className="font-semibold text-[#4F8EF7]">10% Rate</span></td>
                          <td className="px-4 py-2.5 text-right font-bold text-[#020817]">~₹4,500</td>
                        </tr>
                        <tr className="hover:bg-gray-50/50">
                          <td className="px-4 py-2.5 font-bold text-[#020817]">Enterprise</td>
                          <td className="px-4 py-2.5 text-[#64748B]">Custom</td>
                          <td className="px-4 py-2.5"><span className="font-semibold text-[#4F8EF7]">~7% Rate</span></td>
                          <td className="px-4 py-2.5 text-right font-bold text-[#020817]">Scales with deal</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>

                  <p className="text-[11px] text-[#64748B]">
                    * Referrals who choose annual billing earn you a further boosted rate.
                  </p>
                </div>

                {/* FAQ Accordion Section */}
                <div className="bg-white p-6 md:p-8 rounded-xl border border-gray-200 shadow-sm space-y-4">
                  <div className="flex items-center gap-2 text-xs font-bold text-[#4F8EF7] uppercase tracking-wider">
                    <HelpCircle className="w-4 h-4" /> Frequently Asked Questions
                  </div>

                  <div className="divide-y divide-gray-100 border-t border-gray-100">
                    {FAQ_ITEMS.map((item, idx) => {
                      const isOpen = openFaqIndex === idx;
                      return (
                        <div key={idx} className="py-2.5">
                          <button
                            type="button"
                            onClick={() => setOpenFaqIndex(isOpen ? null : idx)}
                            className="w-full flex items-center justify-between text-left py-1 hover:text-[#4F8EF7] transition-colors"
                          >
                            <span className="text-xs font-semibold text-[#020817]" style={{ fontFamily: "DM Sans, sans-serif" }}>
                              {item.q}
                            </span>
                            <ChevronDown
                              className={`w-3.5 h-3.5 shrink-0 transition-transform duration-200 ${
                                isOpen ? "rotate-180 text-[#4F8EF7]" : "text-gray-400"
                              }`}
                            />
                          </button>
                          {isOpen && (
                            <div className="pt-1.5 pb-1 text-xs text-[#64748B]">
                              {item.a}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {/* =========================================================================
                VIEW 2: MY REFERRALS (Personal Actionable Dashboard)
               ========================================================================= */}
            {activeTab === "referrals" && (
              <div className="space-y-6">
                {/* Back to Overview Button */}
                <div>
                  <button
                    type="button"
                    onClick={() => setActiveTab("overview")}
                    className="inline-flex items-center gap-1.5 text-xs font-medium text-[#64748B] hover:text-[#4F8EF7] transition-colors"
                  >
                    <ArrowLeft className="w-4 h-4" />
                    <span>Back to Overview</span>
                  </button>
                </div>

                {/* Merged Plan Selector & Link Output Card */}
                <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm space-y-4">
                  {/* Plan Selector */}
                  <div className="space-y-2">
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-[#64748B]">
                      Select Target Plan Tier
                    </label>

                    {/* Desktop Segmented Control */}
                    <div className="hidden sm:inline-flex bg-gray-100 p-1 rounded-xl gap-1 border border-gray-200/60">
                      {PLANS.map((plan) => {
                        const isSelected = selectedPlan === plan;
                        return (
                          <button
                            key={plan}
                            type="button"
                            onClick={() => setSelectedPlan(plan)}
                            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                              isSelected
                                ? "bg-[#4F8EF7] text-white shadow-xs"
                                : "text-[#64748B] hover:bg-gray-200/70 hover:text-[#020817]"
                            }`}
                          >
                            {plan} <span className="opacity-80 font-normal">· {PLAN_RATES[plan]}</span>
                          </button>
                        );
                      })}
                    </div>

                    {/* Mobile Dropdown Control */}
                    <select
                      className="sm:hidden w-full bg-gray-50 text-[#020817] rounded-xl px-3 py-2 text-xs font-bold border border-gray-200 focus:outline-none"
                      value={selectedPlan}
                      onChange={(e) => setSelectedPlan(e.target.value as PlanTier)}
                    >
                      {PLANS.map((p) => (
                        <option key={p} value={p}>
                          {p} Plan · {PLAN_RATES[p]} Rate
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Link Output Header & Input */}
                  <div className="pt-2 border-t border-gray-100 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-[#020817]" style={{ fontFamily: "DM Sans, sans-serif" }}>
                        {selectedPlan} Plan Link
                      </span>
                      <span className="text-[11px] text-[#64748B] font-mono">Code: {currentCode}</span>
                    </div>

                    <div className="flex items-center gap-2 bg-gray-50 rounded-lg p-2 pl-3 border border-gray-200">
                      <input
                        type="text"
                        readOnly
                        value={currentLink}
                        className="w-full text-xs font-mono text-gray-700 bg-transparent truncate focus:outline-none"
                      />
                      <button
                        type="button"
                        onClick={handleCopyCurrentLink}
                        className="shrink-0 px-3.5 py-1.5 bg-[#4F8EF7] hover:bg-[#3B7ADF] text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-xs"
                      >
                        {isCopied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                        {isCopied ? "Copied" : "Copy"}
                      </button>
                      <button
                        type="button"
                        onClick={handleOpenShareDrawer}
                        className="shrink-0 p-1.5 bg-white hover:bg-gray-100 border border-[#CBD5E1] text-gray-700 rounded-lg text-xs font-semibold transition-colors"
                        title="Share Link"
                      >
                        <Share2 className="w-3.5 h-3.5 text-[#4F8EF7]" />
                      </button>
                    </div>
                  </div>
                </div>

                {/* 4 Metric Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
                  <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm flex items-center justify-between">
                    <div>
                      <p className="text-xs font-medium text-[#64748B]">Total Earned</p>
                      <h3 className="text-2xl font-extrabold text-[#020817] mt-1" style={{ fontFamily: "DM Sans, sans-serif" }}>
                        $1,250.00
                      </h3>
                      <span className="inline-flex items-center gap-1 text-xs font-semibold text-[#16A34A] mt-1">
                        <TrendingUp className="w-3 h-3" /> Historical payouts
                      </span>
                    </div>
                    <div className="w-10 h-10 rounded-xl bg-[rgba(22,163,74,0.10)] text-[#16A34A] flex items-center justify-center shrink-0">
                      <DollarSign className="w-5 h-5" />
                    </div>
                  </div>

                  <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm flex items-center justify-between">
                    <div>
                      <p className="text-xs font-medium text-[#64748B]">Successful Referrals</p>
                      <h3 className="text-2xl font-extrabold text-[#020817] mt-1" style={{ fontFamily: "DM Sans, sans-serif" }}>
                        18
                      </h3>
                      <span className="text-xs font-medium text-[#64748B] mt-1 block">
                        10 Starter · 5 Growth · 3 Scale
                      </span>
                    </div>
                    <div className="w-10 h-10 rounded-xl bg-[#E8F0FE] text-[#4F8EF7] flex items-center justify-center shrink-0">
                      <Users className="w-5 h-5" />
                    </div>
                  </div>

                  <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm flex items-center justify-between">
                    <div>
                      <p className="text-xs font-medium text-[#64748B]">Pending Referrals</p>
                      <h3 className="text-2xl font-extrabold text-[#020817] mt-1" style={{ fontFamily: "DM Sans, sans-serif" }}>
                        7 Referrals
                      </h3>
                      <span className="text-xs font-medium text-amber-700 mt-1 block">7–14% Commission Rate</span>
                    </div>
                    <div className="w-10 h-10 rounded-xl bg-amber-50 border border-amber-200/60 text-amber-600 flex items-center justify-center shrink-0">
                      <Gift className="w-5 h-5" />
                    </div>
                  </div>

                  <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm flex items-center justify-between">
                    <div>
                      <p className="text-xs font-medium text-[#64748B]">Conversion Rate</p>
                      <h3 className="text-2xl font-extrabold text-[#020817] mt-1" style={{ fontFamily: "DM Sans, sans-serif" }}>
                        72.0%
                      </h3>
                      <span className="text-xs font-medium text-[#64748B] mt-1 block">Above average conversion</span>
                    </div>
                    <div className="w-10 h-10 rounded-xl bg-[#E8F0FE] text-[#4F8EF7] flex items-center justify-center shrink-0">
                      <Award className="w-5 h-5" />
                    </div>
                  </div>
                </div>

                {/* Referral Activity Log Table */}
                <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden space-y-4 p-6">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                      <h3 className="text-base font-bold text-[#020817]" style={{ fontFamily: "DM Sans, sans-serif" }}>
                        Referral Activity Log
                      </h3>
                      <p className="text-xs text-[#64748B]">Track status and commission rates for all your invited contacts</p>
                    </div>

                    <div className="flex items-center gap-3">
                      {/* Search Input */}
                      <div className="relative">
                        <Search className="w-3.5 h-3.5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                        <input
                          type="text"
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          placeholder="Search referrals..."
                          className="pl-9 pr-3 py-1.5 border border-gray-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-[#4F8EF7]/20 bg-white"
                        />
                      </div>

                      {/* Filter Dropdown */}
                      <select
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value as any)}
                        className="px-3 py-1.5 border border-gray-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-[#4F8EF7]/20 text-[#020817] bg-white"
                      >
                        <option value="all">All Statuses</option>
                        <option value="paid">Paid</option>
                        <option value="pending">Pending</option>
                        <option value="signed_up">Signed Up</option>
                      </select>
                    </div>
                  </div>

                  {/* Table */}
                  <div className="overflow-x-auto rounded-2xl border border-white/80 overflow-hidden shadow-2xs">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-gradient-to-r from-[#181e25] to-[#2c3e50] text-white font-semibold">
                        <tr>
                          <th className="px-4 py-3" style={{ fontFamily: 'Outfit, sans-serif' }}>CONTACT NAME</th>
                          <th className="px-4 py-3" style={{ fontFamily: 'Outfit, sans-serif' }}>EMAIL / PHONE</th>
                          <th className="px-4 py-3" style={{ fontFamily: 'Outfit, sans-serif' }}>INVITED DATE</th>
                          <th className="px-4 py-3" style={{ fontFamily: 'Outfit, sans-serif' }}>PLAN</th>
                          <th className="px-4 py-3" style={{ fontFamily: 'Outfit, sans-serif' }}>STATUS</th>
                          <th className="px-4 py-3 text-right" style={{ fontFamily: 'Outfit, sans-serif' }}>COMMISSION RATE</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {filteredReferrals.length === 0 ? (
                          <tr>
                            <td colSpan={6} className="py-8 text-center text-[#64748B]">
                              No matching referral records found.
                            </td>
                          </tr>
                        ) : (
                          filteredReferrals.map((item) => (
                            <tr key={item.id} className="hover:bg-gray-50/50 transition-colors">
                              <td className="px-4 py-3.5 font-bold text-[#020817]" style={{ fontFamily: "DM Sans, sans-serif" }}>
                                {item.name}
                              </td>
                              <td className="px-4 py-3.5 text-[#64748B] font-mono text-xs">{item.contact}</td>
                              <td className="px-4 py-3.5 text-[#64748B]">{item.date}</td>
                              <td className="px-4 py-3.5">
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-gray-100 text-gray-700 border border-gray-200">
                                  <PackageCheck className="w-3 h-3 text-[#4F8EF7]" /> {item.plan}
                                </span>
                              </td>
                              <td className="px-4 py-3.5">
                                {item.status === "paid" && (
                                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-[rgba(22,163,74,0.10)] text-[#16A34A] border border-green-200/60">
                                    <Check className="w-3 h-3 text-[#16A34A]" /> Paid
                                  </span>
                                )}
                                {item.status === "pending" && (
                                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200/60">
                                    Pending Approval
                                  </span>
                                )}
                                {item.status === "signed_up" && (
                                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-[#E8F0FE] text-[#4F8EF7] border border-blue-200/60">
                                    Signed Up (Trial)
                                  </span>
                                )}
                              </td>
                              <td className="px-4 py-3.5 text-right font-bold text-[#020817]">
                                <span className="inline-flex items-center gap-1">
                                  <span className="text-[#4F8EF7]">{item.rate} Rate</span>
                                  {item.status === "paid" && <span className="text-gray-400 font-normal">(${item.reward.toFixed(2)})</span>}
                                </span>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}
          </main>
      </div>

      <ReferralShareDrawer
        target={shareTarget}
        onClose={() => setShareTarget(null)}
        onSend={(payload) => {
          console.log("Referral share payload:", payload);
          // TODO: wire to actual send API
        }}
      />
    </div>
  );
}
