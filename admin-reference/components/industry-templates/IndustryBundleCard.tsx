"use client";

import React from "react";
import { GlassCard } from "@/components/ui/GlassCard";
import { Pill } from "@/components/ui/Pill";
import { IndustryStarterBundle } from "@/lib/types/industry-templates";
import {
  Sparkles,
  Layers,
  CheckSquare,
  FileCode,
  Tag,
  Edit2,
  Trash2,
  Eye,
  CheckCircle2,
  PhoneCall,
  SlidersHorizontal,
} from "lucide-react";

interface IndustryBundleCardProps {
  bundle: IndustryStarterBundle;
  onEdit: (bundle: IndustryStarterBundle) => void;
  onPreview: (bundle: IndustryStarterBundle) => void;
  onDelete: (bundleId: string) => void;
  onTestProvision: (bundle: IndustryStarterBundle) => void;
}

export const IndustryBundleCard: React.FC<IndustryBundleCardProps> = ({
  bundle,
  onEdit,
  onPreview,
  onDelete,
  onTestProvision,
}) => {
  const stageCount = bundle.processTemplate?.stages?.length || 0;
  const formCount = bundle.formTemplates?.length || 0;
  const docCount = bundle.documentTemplates?.length || 0;
  const serviceCount = bundle.defaultServices?.length || 0;

  // Total readiness module points: 4 modules (Process, Forms, Docs, Services)
  const isComplete = stageCount > 0 && formCount > 0 && docCount > 0 && serviceCount > 0;

  return (
    <GlassCard
      variant="default"
      rounded="3xl"
      padding="lg"
      className="flex flex-col justify-between h-full group hover:shadow-xl hover:border-[#1456f0]/30 transition-all duration-300 relative overflow-hidden"
    >
      {/* Top Header Row */}
      <div className="space-y-4">
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#1456f0] bg-blue-50/90 px-2.5 py-0.5 rounded-full border border-blue-200/60">
                {bundle.categoryName}
              </span>
              <span className="text-[11px] font-mono text-slate-400">
                v{bundle.version}
              </span>
            </div>
            <h3 className="font-display font-bold text-lg text-[#181e25] group-hover:text-[#1456f0] transition-colors flex items-center gap-2">
              {bundle.industryName}
            </h3>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            {bundle.status === "published" ? (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10.5px] font-bold uppercase tracking-wider bg-emerald-50 text-emerald-700 border border-emerald-200/70 shadow-2xs">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Live Pack
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10.5px] font-bold uppercase tracking-wider bg-slate-100 text-slate-500 border border-slate-200">
                Draft
              </span>
            )}
          </div>
        </div>

        {/* Recommended AI Voice Tone */}
        <div className="p-2.5 rounded-xl bg-slate-50/80 border border-slate-200/60 flex items-center gap-2">
          <Sparkles className="w-3.5 h-3.5 text-amber-500 shrink-0" />
          <div className="text-xs text-slate-600 truncate">
            <span className="font-semibold text-slate-700">AI Persona Tone: </span>
            <span className="italic">{bundle.recommendedTone}</span>
          </div>
        </div>

        {/* Badges */}
        {bundle.badges && bundle.badges.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {bundle.badges.map((badge) => (
              <span
                key={badge}
                className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-purple-50 text-purple-700 border border-purple-200/60"
              >
                {badge}
              </span>
            ))}
          </div>
        )}

        {/* Turnkey Starter Modules Breakdown */}
        <div className="pt-2 border-t border-slate-100 grid grid-cols-2 gap-2">
          <div className="flex items-center gap-2 p-2 rounded-xl bg-white/70 border border-slate-200/50">
            <PhoneCall className="w-3.5 h-3.5 text-blue-600 shrink-0" />
            <div className="text-xs min-w-0">
              <span className="font-bold text-[#181e25] block">{stageCount} Stages</span>
              <span className="text-[10px] text-slate-400 truncate block">Basic + Adv Telephony</span>
            </div>
          </div>

          <div className="flex items-center gap-2 p-2 rounded-xl bg-white/70 border border-slate-200/50">
            <CheckSquare className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
            <div className="text-xs min-w-0">
              <span className="font-bold text-[#181e25] block">{formCount} Web Forms</span>
              <span className="text-[10px] text-slate-400 truncate block">Intake & Bookings</span>
            </div>
          </div>

          <div className="flex items-center gap-2 p-2 rounded-xl bg-white/70 border border-slate-200/50">
            <FileCode className="w-3.5 h-3.5 text-purple-600 shrink-0" />
            <div className="text-xs min-w-0">
              <span className="font-bold text-[#181e25] block">{docCount} KB Docs</span>
              <span className="text-[10px] text-slate-400 truncate block">Verified FAQs</span>
            </div>
          </div>

          <div className="flex items-center gap-2 p-2 rounded-xl bg-white/70 border border-slate-200/50">
            <SlidersHorizontal className="w-3.5 h-3.5 text-amber-600 shrink-0" />
            <div className="text-xs min-w-0">
              <span className="font-bold text-[#181e25] block">{serviceCount} Services</span>
              <span className="text-[10px] text-slate-400 truncate block">Default Catalogs</span>
            </div>
          </div>
        </div>
      </div>

      {/* Action Footer */}
      <div className="pt-4 mt-4 border-t border-slate-100 flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => onPreview(bundle)}
            className="p-2 rounded-xl text-slate-500 hover:text-[#1456f0] hover:bg-blue-50 transition-colors"
            title="Preview Starter Pack Manifest"
          >
            <Eye className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => onDelete(bundle.id)}
            className="p-2 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
            title="Delete Bundle"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>

        <div className="flex items-center gap-2">
          <Pill
            variant="ghost"
            size="sm"
            onClick={() => onTestProvision(bundle)}
            className="text-xs font-semibold hover:bg-emerald-50 hover:text-emerald-700 hover:border-emerald-200"
          >
            Test Provision
          </Pill>
          <Pill
            variant="navy"
            size="sm"
            icon={<Edit2 className="w-3.5 h-3.5" />}
            onClick={() => onEdit(bundle)}
            className="shadow-sm font-semibold"
          >
            Configure
          </Pill>
        </div>
      </div>
    </GlassCard>
  );
};
