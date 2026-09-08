import React, { useState } from "react";
import {
  Search,
  ChevronDown,
  ChevronUp,
  UserPlus,
  Link2,
  DownloadCloud,
  ArrowRight,
  ExternalLink,
  HelpCircle,
  BookOpen,
  Milestone,
  CheckCircle2,
  Users,
  Sparkles,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import {
  ABDM_GLOSSARY,
  ABDM_FAQS,
  GlossaryTerm,
  FaqItemData,
} from "../../data/abdmKnowledgeData";
import { ABHAPatientRecord } from "../../services/abdmService";

interface ABDMKnowledgeCenterProps {
  onNavigateM1Create: () => void;
  onNavigateM2Link: () => void;
  onNavigateM3Fetch: () => void;
  activePatient?: ABHAPatientRecord | null;
}

export const ABDMKnowledgeCenter: React.FC<ABDMKnowledgeCenterProps> = ({
  onNavigateM1Create,
  onNavigateM2Link,
  onNavigateM3Fetch,
  activePatient,
}) => {
  const [activeTab, setActiveTab] = useState<"milestones" | "glossary" | "faq">(
    "milestones"
  );
  const [searchQuery, setSearchQuery] = useState("");
  const [openFaqIds, setOpenFaqIds] = useState<string[]>(["faq-1"]);

  const patientName = activePatient?.name || "Jasmine";

  const toggleFaq = (id: string) => {
    setOpenFaqIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const filteredFaqs = ABDM_FAQS.filter((faq) => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return true;
    return (
      faq.question.toLowerCase().includes(q) ||
      faq.answer.toLowerCase().includes(q) ||
      faq.keywords.some((kw) => kw.toLowerCase().includes(q))
    );
  });

  return (
    <div className="bg-white rounded-3xl border border-slate-200/90 shadow-2xs p-6 md:p-8 space-y-6">
      {/* ── Knowledge Center Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-5">
        <div>
          <span className="text-[10px] font-extrabold uppercase tracking-widest text-[#1456f0] block font-display mb-1">
            KNOWLEDGE CENTER
          </span>
          <h2
            className="text-xl md:text-2xl font-bold text-slate-900 tracking-tight"
            style={{ fontFamily: "Outfit, sans-serif" }}
          >
            Learn ABDM
          </h2>
        </div>

        {/* Quick Utility Badges / Links */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onNavigateM1Create}
            className="w-8 h-8 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center hover:bg-blue-50 hover:text-[#1456f0] transition-colors cursor-pointer title-tooltip"
            title="Patient Registry"
            aria-label="Open M1 Patient Registry"
          >
            <Users className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={onNavigateM2Link}
            className="w-8 h-8 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center hover:bg-blue-50 hover:text-[#1456f0] transition-colors cursor-pointer title-tooltip"
            title="Record Linkage"
            aria-label="Open M2 Record Linkage"
          >
            <Link2 className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={onNavigateM3Fetch}
            className="w-8 h-8 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center hover:bg-blue-50 hover:text-[#1456f0] transition-colors cursor-pointer title-tooltip"
            title="Consent Gateway"
            aria-label="Open M3 Consent Gateway"
          >
            <DownloadCloud className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* ── Tabs Navigation ── */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-hide">
        <button
          type="button"
          onClick={() => setActiveTab("milestones")}
          className={`px-4 py-2 rounded-full text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
            activeTab === "milestones"
              ? "bg-slate-950 text-white shadow-xs"
              : "bg-slate-100 text-slate-600 hover:bg-slate-200/80 hover:text-slate-900"
          }`}
        >
          <Milestone className="w-3.5 h-3.5" />
          <span>Milestones</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("glossary")}
          className={`px-4 py-2 rounded-full text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
            activeTab === "glossary"
              ? "bg-slate-950 text-white shadow-xs"
              : "bg-slate-100 text-slate-600 hover:bg-slate-200/80 hover:text-slate-900"
          }`}
        >
          <BookOpen className="w-3.5 h-3.5" />
          <span>ABDM Glossary</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("faq")}
          className={`px-4 py-2 rounded-full text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
            activeTab === "faq"
              ? "bg-slate-950 text-white shadow-xs"
              : "bg-slate-100 text-slate-600 hover:bg-slate-200/80 hover:text-slate-900"
          }`}
        >
          <HelpCircle className="w-3.5 h-3.5" />
          <span>FAQ</span>
        </button>
      </div>

      {/* ── Tab 1: Milestones Journey (Workflow Timeline) ── */}
      {activeTab === "milestones" && (
        <div className="space-y-6 pt-2">
          {/* Patient Context Badge */}
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-100 border border-slate-200/80 text-xs font-medium text-slate-700">
            <span className="w-2 h-2 rounded-full bg-[#1456f0] animate-pulse" />
            <span>Following <strong>{patientName}</strong>'s visit</span>
          </div>

          {/* Vertical Workflow Timeline */}
          <div className="relative pl-6 sm:pl-10 space-y-6 before:absolute before:left-3 sm:before:left-5 before:top-4 before:bottom-8 before:w-0.5 before:bg-slate-200">
            {/* Step 1: Milestone 1 */}
            <div className="relative">
              {/* Timeline Marker */}
              <div className="absolute -left-6 sm:-left-10 top-5 -translate-x-1/2 w-8 h-8 rounded-full bg-white border-2 border-[#1456f0] text-[#1456f0] flex items-center justify-center shadow-xs z-10">
                <Users className="w-4 h-4" />
              </div>

              <div className="bg-white p-5 sm:p-6 rounded-2xl border border-slate-200/80 hover:border-[#1456f0]/40 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-2xs">
                <div className="space-y-1">
                  <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 block font-display">
                    MILESTONE 1 • CREATE ABHA
                  </span>
                  <h3 className="text-sm sm:text-base font-bold text-slate-900 font-display">
                    Register {patientName}'s ABHA
                  </h3>
                  <p className="text-xs text-slate-500 leading-relaxed max-w-xl">
                    <strong className="text-slate-800 font-semibold">{patientName}</strong> walks in without a health ID. Create an ABHA so every health record can be linked to one identity.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={onNavigateM1Create}
                  className="px-5 py-2.5 rounded-xl bg-[#1456f0] hover:bg-[#1147cc] text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-xs shadow-blue-500/20 active:scale-[0.99] transition-all cursor-pointer flex-shrink-0"
                >
                  <span>Create ABHA</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Step 2: Milestone 2 */}
            <div className="relative">
              {/* Timeline Marker */}
              <div className="absolute -left-6 sm:-left-10 top-5 -translate-x-1/2 w-8 h-8 rounded-full bg-white border-2 border-[#1456f0] text-[#1456f0] flex items-center justify-center shadow-xs z-10">
                <Link2 className="w-4 h-4" />
              </div>

              <div className="bg-white p-5 sm:p-6 rounded-2xl border border-slate-200/80 hover:border-[#1456f0]/40 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-2xs">
                <div className="space-y-1">
                  <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 block font-display">
                    MILESTONE 2 • LINK RECORDS
                  </span>
                  <h3 className="text-sm sm:text-base font-bold text-slate-900 font-display">
                    Link her prescription & reports
                  </h3>
                  <p className="text-xs text-slate-500 leading-relaxed max-w-xl">
                    After the consult, link <strong className="text-slate-800 font-semibold">{patientName}</strong>'s records to her ABHA. This connects clinical encounters to her account.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={onNavigateM2Link}
                  className="px-5 py-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-800 font-bold text-xs flex items-center justify-center gap-1.5 shadow-2xs active:scale-[0.99] transition-all cursor-pointer flex-shrink-0"
                >
                  <ExternalLink className="w-3.5 h-3.5 text-slate-500" />
                  <span>See how</span>
                </button>
              </div>
            </div>

            {/* Step 3: Milestone 3 */}
            <div className="relative">
              {/* Timeline Marker */}
              <div className="absolute -left-6 sm:-left-10 top-5 -translate-x-1/2 w-8 h-8 rounded-full bg-white border-2 border-[#1456f0] text-[#1456f0] flex items-center justify-center shadow-xs z-10">
                <DownloadCloud className="w-4 h-4" />
              </div>

              <div className="bg-white p-5 sm:p-6 rounded-2xl border border-slate-200/80 hover:border-[#1456f0]/40 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-2xs">
                <div className="space-y-1">
                  <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 block font-display">
                    MILESTONE 3 • FETCH RECORDS
                  </span>
                  <h3 className="text-sm sm:text-base font-bold text-slate-900 font-display">
                    Pull her past history
                  </h3>
                  <p className="text-xs text-slate-500 leading-relaxed max-w-xl">
                    On her next visit, fetch <strong className="text-slate-800 font-semibold">{patientName}</strong>'s records shared from other facilities, with her explicit consent.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={onNavigateM3Fetch}
                  className="px-5 py-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-800 font-bold text-xs flex items-center justify-center gap-1.5 shadow-2xs active:scale-[0.99] transition-all cursor-pointer flex-shrink-0"
                >
                  <ExternalLink className="w-3.5 h-3.5 text-slate-500" />
                  <span>See how</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Tab 2: ABDM Glossary Grid ── */}
      {activeTab === "glossary" && (
        <div className="space-y-4 pt-2">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {ABDM_GLOSSARY.map((item) => (
              <div
                key={item.id}
                className="bg-white p-5 rounded-2xl border border-slate-200/80 hover:border-[#1456f0]/30 transition-all space-y-1.5 shadow-2xs"
              >
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-bold text-slate-900 font-display">
                    {item.term}
                  </h4>
                  <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                    {item.fullName}
                  </span>
                </div>
                <p className="text-xs text-slate-600 leading-relaxed">
                  {item.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Tab 3: FAQ Accordion List with Search ── */}
      {activeTab === "faq" && (
        <div className="space-y-5 pt-2">
          {/* FAQ Search Bar */}
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search a question..."
              className="w-full pl-11 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-semibold text-slate-900 outline-none focus:bg-white focus:border-[#1456f0] focus:ring-3 focus:ring-[#1456f0]/15 transition-all"
            />
          </div>

          {/* Accordion FAQ Items */}
          <div className="space-y-2.5">
            {filteredFaqs.length > 0 ? (
              filteredFaqs.map((faq) => {
                const isOpen = openFaqIds.includes(faq.id);
                return (
                  <div
                    key={faq.id}
                    className="bg-white border border-slate-200/80 rounded-2xl overflow-hidden transition-all shadow-2xs"
                  >
                    <button
                      type="button"
                      onClick={() => toggleFaq(faq.id)}
                      className="w-full px-5 py-4 flex items-center justify-between gap-4 text-left hover:bg-slate-50/70 transition-colors cursor-pointer"
                    >
                      <span className="text-xs sm:text-sm font-bold text-slate-800 font-display">
                        {faq.question}
                      </span>
                      {isOpen ? (
                        <ChevronUp className="w-4 h-4 text-slate-400 flex-shrink-0" />
                      ) : (
                        <ChevronDown className="w-4 h-4 text-slate-400 flex-shrink-0" />
                      )}
                    </button>

                    <AnimatePresence>
                      {isOpen && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.18 }}
                          className="overflow-hidden"
                        >
                          <div className="px-5 pb-4 pt-1 text-xs text-slate-600 leading-relaxed border-t border-slate-100 bg-slate-50/30">
                            {faq.answer}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                );
              })
            ) : (
              <div className="py-12 text-center text-slate-400 space-y-1">
                <HelpCircle className="w-8 h-8 mx-auto text-slate-300" />
                <h4 className="text-xs font-bold text-slate-600 font-display">
                  No FAQs found
                </h4>
                <p className="text-[11px] text-slate-400">
                  Try searching for keywords like "ABHA", "M1", "Consent", or "KYC".
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
