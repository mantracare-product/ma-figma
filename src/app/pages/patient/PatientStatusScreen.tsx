import React from "react";
import { useOutletContext, useNavigate } from "react-router";
import {
  CheckCircle2,
  Clock,
  ArrowRight,
  Sparkles,
  Layers,
  ChevronRight,
  ShieldCheck,
  User,
  Phone,
  Mail,
  Calendar,
  Pill,
  Receipt,
  QrCode,
  RotateCcw,
} from "lucide-react";
import { Client } from "../../../lib/clientsStore";
import { Process, Stage } from "../../../lib/useProcessStore";
import { STAGE_ROUTES } from "./PatientPortalLayout";

interface PortalContext {
  activeClient: Client;
  activeProcess: Process;
  currentStageName: string;
  currentStageIndex: number;
  stages: Stage[];
  onStageChange: (newStageName: string) => void;
}

export default function PatientStatusScreen() {
  const navigate = useNavigate();
  const {
    activeClient,
    activeProcess,
    currentStageName,
    currentStageIndex,
    stages,
    onStageChange,
  } = useOutletContext<PortalContext>();

  const currentStage = stages[currentStageIndex] || stages[0];
  const completedStages = stages.slice(0, currentStageIndex);
  const nextStage = currentStageIndex < stages.length - 1 ? stages[currentStageIndex + 1] : null;

  const currentRoute = STAGE_ROUTES[currentStage?.name] || "/patient";

  const stageIcons: Record<string, React.ReactNode> = {
    "Client Checked In": <QrCode className="w-5 h-5" />,
    "Book Appointment": <Calendar className="w-5 h-5" />,
    "Move to Pharmacy": <Pill className="w-5 h-5" />,
    "Pay Bill": <Receipt className="w-5 h-5" />,
    "Payment Done": <CheckCircle2 className="w-5 h-5" />,
  };

  return (
    <div className="space-y-8 max-w-5xl mx-auto">
      {/* Hero Welcome Card */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-6 sm:p-8 shadow-xs relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-bl from-blue-50/80 via-transparent to-transparent pointer-events-none rounded-tr-2xl" />

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 relative z-10">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-slate-900 to-slate-800 text-white flex items-center justify-center text-xl font-bold shadow-md shadow-slate-900/10">
              {activeClient.name
                .split(" ")
                .map((n) => n[0])
                .join("")
                .slice(0, 2)
                .toUpperCase()}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-bold tracking-tight text-slate-900">
                  {activeClient.name}
                </h1>
                <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
                  {activeClient.id}
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500 mt-1">
                {activeClient.phone && (
                  <span className="flex items-center gap-1">
                    <Phone className="w-3.5 h-3.5 text-slate-400" />
                    {activeClient.phone}
                  </span>
                )}
                {activeClient.email && (
                  <span className="flex items-center gap-1">
                    <Mail className="w-3.5 h-3.5 text-slate-400" />
                    {activeClient.email}
                  </span>
                )}
                <span className="flex items-center gap-1 text-blue-600 font-medium">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  Verified Patient
                </span>
              </div>
            </div>
          </div>

          {/* Quick Action Button for Active Stage */}
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => navigate(currentRoute)}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm shadow-sm shadow-blue-600/20 hover:shadow-md transition-all active:scale-[0.98]"
            >
              <span>Go to Active Step ({currentStage?.name})</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* 5-Stage Visual Progression Stepper Card */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-6 sm:p-8 shadow-xs">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-lg font-bold text-slate-900">Care Journey Timeline</h2>
            <p className="text-xs text-slate-500">
              5-stage standardized protocol connected to AI Receptionist & Dashboard
            </p>
          </div>
          <span className="text-xs font-semibold px-3 py-1 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
            Step {currentStageIndex + 1} of {stages.length}
          </span>
        </div>

        {/* Stepper Pipeline */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 relative">
          {stages.map((stage, idx) => {
            const isCompleted = idx < currentStageIndex;
            const isCurrent = idx === currentStageIndex;
            const isUpcoming = idx > currentStageIndex;
            const targetRoute = STAGE_ROUTES[stage.name] || "/patient";

            return (
              <div
                key={stage.id || idx}
                onClick={() => navigate(targetRoute)}
                className={`group relative p-4 rounded-xl border text-left cursor-pointer transition-all ${
                  isCurrent
                    ? "bg-blue-50/60 border-blue-400/80 shadow-xs ring-2 ring-blue-500/10"
                    : isCompleted
                    ? "bg-slate-50/80 border-slate-200 hover:border-slate-300"
                    : "bg-white border-slate-200/60 opacity-60 hover:opacity-100"
                }`}
              >
                <div className="flex items-center justify-between mb-3">
                  <div
                    className={`w-8 h-8 rounded-lg flex items-center justify-center transition-transform group-hover:scale-105 ${
                      isCurrent
                        ? "bg-blue-600 text-white"
                        : isCompleted
                        ? "bg-emerald-600 text-white"
                        : "bg-slate-100 text-slate-400"
                    }`}
                  >
                    {isCompleted ? (
                      <CheckCircle2 className="w-4 h-4" />
                    ) : (
                      stageIcons[stage.name] || <span className="text-xs font-bold">{idx + 1}</span>
                    )}
                  </div>
                  <span
                    className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                      isCurrent
                        ? "bg-blue-200/70 text-blue-900"
                        : isCompleted
                        ? "bg-emerald-100 text-emerald-800"
                        : "bg-slate-100 text-slate-500"
                    }`}
                  >
                    {isCurrent ? "Current" : isCompleted ? "Done" : "Pending"}
                  </span>
                </div>

                <div className="font-semibold text-sm text-slate-900 group-hover:text-blue-600 transition-colors">
                  {stage.name}
                </div>
                <div className="text-[11px] text-slate-500 line-clamp-2 mt-1 leading-snug">
                  {stage.description}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 3 Pillars Summary: What's Completed | Current Step | What's Next */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Card 1: Completed Steps */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                Completed Steps
              </span>
              <span className="w-6 h-6 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center text-xs font-bold">
                {completedStages.length}
              </span>
            </div>

            {completedStages.length === 0 ? (
              <p className="text-xs text-slate-400 italic py-4">
                No stages completed yet. Your journey begins at Stage 1 (Client Checked In).
              </p>
            ) : (
              <ul className="space-y-3">
                {completedStages.map((st, i) => (
                  <li key={st.id || i} className="flex items-start gap-2.5 text-xs text-slate-700">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-semibold text-slate-900">{st.name}</span>
                      <p className="text-[11px] text-slate-500">{st.description}</p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <div className="mt-4 pt-4 border-t border-slate-100 text-[11px] text-slate-400">
            {completedStages.length > 0 ? "Stages verified & saved to canonical store." : "Waiting to begin."}
          </div>
        </div>

        {/* Card 2: Current Active Step (Highlight) */}
        <div className="bg-gradient-to-b from-blue-50/50 to-white rounded-2xl border-2 border-blue-500/40 p-6 shadow-xs flex flex-col justify-between relative overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 bg-blue-100/40 rounded-full blur-xl pointer-events-none" />

          <div>
            <div className="flex items-center justify-between mb-4">
              <span className="text-xs font-bold text-blue-700 uppercase tracking-wider flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-blue-600 animate-pulse" />
                Current Active Step
              </span>
              <span className="text-xs font-bold text-blue-800 bg-blue-100 px-2 py-0.5 rounded-md">
                Step {currentStageIndex + 1}
              </span>
            </div>

            <div className="space-y-2">
              <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                {stageIcons[currentStage?.name]}
                {currentStage?.name}
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                {currentStage?.description}
              </p>
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-blue-100">
            <button
              type="button"
              onClick={() => navigate(currentRoute)}
              className="w-full flex items-center justify-center gap-2 py-2.5 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold shadow-xs transition-colors"
            >
              <span>Perform Step Action</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Card 3: What's Next */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                Upcoming Next Step
              </span>
              <Clock className="w-4 h-4 text-slate-400" />
            </div>

            {nextStage ? (
              <div className="space-y-2">
                <h3 className="text-base font-semibold text-slate-900 flex items-center gap-2">
                  <span className="w-6 h-6 rounded-lg bg-slate-100 text-slate-700 flex items-center justify-center text-xs font-bold">
                    {currentStageIndex + 2}
                  </span>
                  {nextStage.name}
                </h3>
                <p className="text-xs text-slate-500 leading-relaxed">
                  {nextStage.description}
                </p>
              </div>
            ) : (
              <div className="py-4 text-center">
                <CheckCircle2 className="w-10 h-10 text-emerald-600 mx-auto mb-2" />
                <div className="font-bold text-slate-900 text-sm">All Steps Completed</div>
                <p className="text-xs text-slate-500 mt-1">
                  You have successfully reached the final stage of your care protocol.
                </p>
              </div>
            )}
          </div>

          <div className="mt-4 pt-4 border-t border-slate-100">
            {nextStage ? (
              <button
                type="button"
                onClick={() => onStageChange(nextStage.name)}
                className="w-full flex items-center justify-center gap-1.5 py-2 px-3 bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-lg text-xs font-medium transition-colors"
                title="Fast forward stage in demo"
              >
                Advance to {nextStage.name}
                <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
              </button>
            ) : (
              <button
                type="button"
                onClick={() => onStageChange("Client Checked In")}
                className="w-full flex items-center justify-center gap-1.5 py-2 px-3 bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-lg text-xs font-medium transition-colors"
                title="Reset demo journey"
              >
                <RotateCcw className="w-3 h-3 text-slate-400" />
                Reset Journey to Step 1
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
