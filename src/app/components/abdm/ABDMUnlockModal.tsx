import React from "react";
import { motion } from "motion/react";
import { ArrowRight, Lock, CreditCard, Link2, Cloud } from "lucide-react";
import abdmLogo from "../../../assets/abdm/abdm-logo.f4a16ac5b7650b3a70033e233e6122e0.svg";
import nhaLogo from "../../../assets/abdm/NHA.b7adfb67b258bee7ddf57b57969e2749.svg";
import mantraLogo from "../../../assets/abdm/logo.png";

interface ABDMUnlockModalProps {
  onUnlock: () => void;
  isLoading?: boolean;
}

export const ABDMUnlockModal: React.FC<ABDMUnlockModalProps> = ({
  onUnlock,
  isLoading = false,
}) => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Dimmed & Blurred backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="absolute inset-0 bg-slate-900/40 backdrop-blur-md"
      />

      {/* Main Unlock Card */}
      <motion.div
        initial={{ opacity: 0, y: 12, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 12, scale: 0.97 }}
        transition={{ duration: 0.22, ease: "easeOut" }}
        className="relative w-full max-w-[430px] bg-white rounded-3xl shadow-2xl border border-slate-100 overflow-hidden z-10 select-none"
      >
        {/* Top 3.5px MantraAssist Blue Accent Line */}
        <div className="h-[3.5px] w-full bg-gradient-to-r from-[#1456f0] via-[#3b82f6] to-[#181e25]" />

        <div className="p-7 pt-6 space-y-6">
          {/* Header */}
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <img
                src={abdmLogo}
                alt="ABDM Lotus Logo"
                className="w-5 h-5 object-contain"
              />
              <span className="text-[11px] font-bold tracking-wider text-[#1456f0] uppercase font-display">
                AYUSHMAN BHARAT DIGITAL MISSION
              </span>
            </div>
            <h2
              className="text-[22px] font-bold text-slate-900 tracking-tight"
              style={{ fontFamily: "Outfit, sans-serif" }}
            >
              Your ABDM dashboard
            </h2>
          </div>

          {/* 3 Feature Benefits */}
          <div className="space-y-4">
            {/* Benefit 1 */}
            <div className="flex items-start gap-3.5">
              <div className="w-8 h-8 rounded-xl bg-blue-50 text-[#1456f0] flex items-center justify-center flex-shrink-0 shadow-2xs mt-0.5">
                <CreditCard className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-[13.5px] font-bold text-slate-800 font-display leading-snug">
                  One identity per patient
                </h4>
                <p className="text-[12px] text-slate-500 leading-relaxed mt-0.5">
                  Create an ABHA at the desk so every record links to the same person.
                </p>
              </div>
            </div>

            {/* Benefit 2 */}
            <div className="flex items-start gap-3.5">
              <div className="w-8 h-8 rounded-xl bg-blue-50 text-[#1456f0] flex items-center justify-center flex-shrink-0 shadow-2xs mt-0.5">
                <Link2 className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-[13.5px] font-bold text-slate-800 font-display leading-snug">
                  Records that earn
                </h4>
                <p className="text-[12px] text-slate-500 leading-relaxed mt-0.5">
                  Link prescriptions and reports to ABHA — this is what DHIS pays for.
                </p>
              </div>
            </div>

            {/* Benefit 3 */}
            <div className="flex items-start gap-3.5">
              <div className="w-8 h-8 rounded-xl bg-blue-50 text-[#1456f0] flex items-center justify-center flex-shrink-0 shadow-2xs mt-0.5">
                <Cloud className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-[13.5px] font-bold text-slate-800 font-display leading-snug">
                  History on tap
                </h4>
                <p className="text-[12px] text-slate-500 leading-relaxed mt-0.5">
                  Pull a patient's past records from other facilities, with their consent.
                </p>
              </div>
            </div>
          </div>

          {/* Unlock Button CTA */}
          <div>
            <button
              type="button"
              onClick={onUnlock}
              disabled={isLoading}
              className="w-full h-12 rounded-2xl bg-[#1456f0] hover:bg-[#1147cc] text-white font-bold text-[14px] flex items-center justify-center gap-2.5 shadow-md shadow-blue-500/25 hover:shadow-lg hover:shadow-blue-500/30 hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.99] transition-all duration-150 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
              style={{ fontFamily: "Outfit, sans-serif" }}
            >
              {isLoading ? (
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                  <span>Unlocking ABDM...</span>
                </div>
              ) : (
                <>
                  <Lock className="w-4 h-4 fill-white/20" />
                  <span>Unlock ABDM</span>
                  <ArrowRight className="w-4 h-4 ml-0.5" />
                </>
              )}
            </button>

            {/* Sample data note */}
            <div className="mt-3.5 flex items-center justify-center gap-1.5 text-center">
              <span className="w-1.5 h-1.5 rounded-full bg-slate-300" />
              <p className="text-[11.5px] font-medium text-slate-400">
                The dashboard behind this card shows sample data
              </p>
            </div>
          </div>

          {/* Strictly 3 Branding Badges at the bottom */}
          <div className="pt-4 border-t border-slate-100/90 flex items-center justify-between px-2">
            {/* 1. MantraAssist Logo */}
            <div className="flex items-center justify-center h-7 max-w-[95px]">
              <img
                src={mantraLogo}
                alt="MantraAssist"
                className="max-h-6 w-auto object-contain"
              />
            </div>

            {/* 2. ABDM Official Badge */}
            <div className="flex items-center justify-center h-7 max-w-[85px]">
              <img
                src={abdmLogo}
                alt="ABDM"
                className="max-h-6 w-auto object-contain"
              />
            </div>

            {/* 3. National Health Authority (NHA) Badge */}
            <div className="flex items-center justify-center h-7 max-w-[95px]">
              <img
                src={nhaLogo}
                alt="National Health Authority"
                className="max-h-6 w-auto object-contain"
              />
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
};
