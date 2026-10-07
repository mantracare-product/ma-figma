import React, { useState } from "react";
import { createPortal } from "react-dom";
import { X, ChevronRight, ChevronDown, Info, GitBranch } from "lucide-react";
import { Tooltip } from "../ui/Tooltip";
import StepParametersFields from "./StepParametersFields";
import type { WorkflowStep } from "../../types/workflow";
import { EVENT_CATALOG } from "../../../lib/useAutomationStore";
import { EntityType } from "../../../lib/useProcessStore";
import type { ScopingRule } from "../../context/FieldRegistryContext";

export interface StepDetailDrawerProps {
  isOpen: boolean;
  step: WorkflowStep | null;
  isCreatingNewStep: boolean;
  stepAllowedTriggers?: Record<string, Array<string>>;
  processes: any[];
  scopingRules?: ScopingRule[];

  stepTrigger: string;
  onStepTriggerChange: (t: any) => void;

  context?: "stage" | "automation";
  entityType?: EntityType;
  customTriggers?: Array<{ key: string; label: string; desc?: string }>;

  executionType: "wait" | "parallel";
  onExecutionTypeChange: (t: "wait" | "parallel") => void;

  delayValue: number;
  onDelayValueChange: (v: number) => void;
  delayUnit: string;
  onDelayUnitChange: (u: string) => void;

  connectAfterId: string | undefined;
  onConnectAfterIdChange: (id: string | undefined) => void;
  availablePredecessors: Array<{ id: string; label: string; isParallelGroup: boolean }>;

  params: Record<string, any>;
  onParamsChange: (patch: Record<string, any>) => void;

  onBack: () => void;
  onClose: () => void;
  onSave?: () => void;
  onShowInFlowBuilder?: () => void;
  onlyParameters?: boolean;
}

function InfoTooltip({ text }: { text: string }) {
  return (
    <Tooltip content={text} position="top">
      <span className="inline-flex items-center text-muted-foreground hover:text-foreground cursor-help">
        <Info className="w-3.5 h-3.5" />
      </span>
    </Tooltip>
  );
}

export default function StepDetailDrawer({
  isOpen,
  step,
  isCreatingNewStep,
  stepAllowedTriggers = {},
  processes,
  scopingRules = [],
  stepTrigger,
  onStepTriggerChange,
  context = "stage",
  entityType,
  customTriggers,
  executionType,
  onExecutionTypeChange,
  delayValue,
  onDelayValueChange,
  delayUnit,
  onDelayUnitChange,
  connectAfterId,
  onConnectAfterIdChange,
  availablePredecessors,
  params,
  onParamsChange,
  onBack,
  onClose,
  onSave,
  onShowInFlowBuilder,
  onlyParameters = false,
}: StepDetailDrawerProps) {
  // Local UI-only state — neither caller needs to own this
  const [executionTimingModalOpen, setExecutionTimingModalOpen] = useState(false);

  if (typeof document === "undefined" || !isOpen || !step) return null;

  // Build trigger options based on context
  let triggerOptions: Array<{ key: string; label: string; desc: string }> = [];

  if (context === "automation") {
    if (customTriggers && customTriggers.length > 0) {
      triggerOptions = customTriggers.map((ct) => ({
        key: ct.key,
        label: ct.label,
        desc: ct.desc || `Fires when ${ct.label} occurs`,
      }));
    } else {
      const entityEvents = EVENT_CATALOG[entityType || "appointment"] || EVENT_CATALOG.appointment;
      triggerOptions = entityEvents.map((ev) => ({
        key: ev.event,
        label: ev.label,
        desc: `Fires automatically when the ${ev.label.toLowerCase()} event is triggered.`,
      }));
    }
  } else {
    // Stage-level triggers: strictly two triggers (On Stage Enter & On Stage Exit)
    triggerOptions = [
      { key: "stage", label: "On Stage Enter", desc: "Runs automatically when the record enters this stage." },
      { key: "exit_stage", label: "On Stage Exit", desc: "Runs automatically when the record exits this stage." },
    ];
  }

  const activeTrigger = triggerOptions.find((t) => t.key === stepTrigger) || triggerOptions[0];
  const subtitleText =
    activeTrigger?.desc ||
    (stepTrigger === "exit_stage"
      ? "Runs automatically when the record exits this stage."
      : "Runs in sequence as part of this stage's step order, with an optional delay.");

  return createPortal(
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-[60]"
        style={{ backgroundColor: "rgba(0,0,0,0.30)" }}
        onClick={() => {
          if (isCreatingNewStep) {
            onBack();
          } else {
            onClose();
          }
        }}
      />

      {/* Drawer panel */}
      <div
        className="fixed top-0 right-0 h-screen z-[70] flex flex-col bg-white border-l border-border"
        style={{
          width: "35vw",
          minWidth: "35vw",
          maxWidth: "35vw",
          boxShadow: "-4px 0 24px rgba(0,0,0,0.12)",
        }}
      >
        {/* Header */}
        <div className="flex-shrink-0 px-6 pt-6 pb-4 border-b border-border">
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2
                  className="text-xl font-bold"
                  style={{ color: "#020817", fontFamily: "DM Sans, sans-serif" }}
                >
                  {step.name}
                </h2>
              </div>
              <p
                className="text-sm mt-1"
                style={{ color: "#64748B", fontFamily: "Outfit, sans-serif" }}
              >
                {step.description}
              </p>
            </div>
            <div className="flex items-center gap-2 ml-4 flex-shrink-0">
              {!onlyParameters && onShowInFlowBuilder && (
                <button
                  type="button"
                  onClick={onShowInFlowBuilder}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-blue-200 bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-semibold transition-colors cursor-pointer"
                  title="Open this step in the visual flow builder canvas"
                >
                  <GitBranch className="w-3.5 h-3.5 text-blue-600" />
                  <span>Show in flow builder</span>
                </button>
              )}
              <button
                onClick={() => {
                  if (isCreatingNewStep) {
                    onBack();
                  } else {
                    onClose();
                  }
                }}
                className="p-2 rounded hover:bg-muted/40 transition-colors"
              >
                <X className="w-5 h-5 text-muted-foreground" />
              </button>
            </div>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-6 space-y-6">
          {!onlyParameters && (
            <>
              {/* Trigger, Execution & Delay Row */}
              <div className="flex items-start gap-4">
                {/* Column 1 — Trigger Dropdown */}
                <div className="w-[280px] flex-shrink-0">
                  <div className="flex items-center gap-1.5 mb-2">
                    <label
                      className="text-sm font-semibold"
                      style={{ color: "#020817", fontFamily: "DM Sans, sans-serif" }}
                    >
                      Trigger
                    </label>
                    <InfoTooltip text="Select the event or stage lifecycle point that triggers this action." />
                  </div>

                  <div className="relative">
                    <select
                      value={stepTrigger}
                      onChange={(e) => onStepTriggerChange(e.target.value)}
                      className="w-full appearance-none px-3.5 py-2.5 pr-9 text-sm font-medium rounded-lg border border-border bg-white text-gray-900 shadow-xs outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 cursor-pointer transition-colors"
                      style={{ fontFamily: "Outfit, sans-serif" }}
                    >
                      {triggerOptions.map((opt) => (
                        <option key={opt.key} value={opt.key}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                    <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400">
                      <ChevronDown className="w-4 h-4" />
                    </div>
                  </div>

                  <p
                    className="text-xs mt-2 leading-relaxed"
                    style={{ color: "#64748B", fontFamily: "Outfit, sans-serif" }}
                  >
                    {subtitleText}
                  </p>
                </div>

                {/* Column 2 — Execution */}
                {stepTrigger === "stage" || stepTrigger === "enter_stage" || stepTrigger === "exit_stage" || context === "automation" ? (
                  <div className="w-[140px] flex-shrink-0">
                    <div className="flex items-center gap-1.5 mb-2">
                      <label
                        className="text-sm font-semibold"
                        style={{ color: "#020817", fontFamily: "DM Sans, sans-serif" }}
                      >
                        Execution
                      </label>
                      <InfoTooltip text="Wait runs this step only after the previous one finishes. Parallel runs it at the same time as other steps." />
                    </div>
                    <button
                      onClick={() => setExecutionTimingModalOpen(true)}
                      className="w-full flex items-center justify-between px-3 py-2.5 rounded-md border border-border bg-white hover:bg-muted/20 transition-colors text-left"
                    >
                      <span
                        className="text-sm truncate"
                        style={{ color: "#020817", fontFamily: "Outfit, sans-serif" }}
                      >
                        {executionType === "wait" ? "Wait" : "In Parallel"}
                      </span>
                      <ChevronRight className="w-4 h-4 text-muted-foreground flex-shrink-0 ml-1" />
                    </button>
                  </div>
                ) : stepTrigger === "postcall" ? (
                  <div className="w-[140px] flex-shrink-0">
                    <div className="flex items-center gap-1.5 mb-2">
                      <label
                        className="text-sm font-semibold"
                        style={{ color: "#020817", fontFamily: "DM Sans, sans-serif" }}
                      >
                        Execution
                      </label>
                      <InfoTooltip text="Wait runs this step only after the previous one finishes. Parallel runs it at the same time as other steps." />
                    </div>
                    <button
                      onClick={() => setExecutionTimingModalOpen(true)}
                      className="w-full flex items-center justify-between px-3 py-2.5 rounded-md border border-border bg-white hover:bg-muted/20 transition-colors text-left"
                    >
                      <span
                        className="text-sm truncate"
                        style={{ color: "#020817", fontFamily: "Outfit, sans-serif" }}
                      >
                        {executionType === "wait" ? "Wait" : "In Parallel"}
                      </span>
                      <ChevronRight className="w-4 h-4 text-muted-foreground flex-shrink-0 ml-1" />
                    </button>
                  </div>
                ) : stepTrigger === "incall" || stepTrigger === "inchat" ? (
                  <div className="w-fit flex-shrink-0">
                    <label
                      className="block text-sm font-semibold mb-2"
                      style={{ color: "#020817", fontFamily: "DM Sans, sans-serif" }}
                    >
                      Execution
                    </label>
                    <div
                      className="w-full px-3 py-2.5 rounded-md border border-border bg-muted/10 flex items-center gap-2"
                      style={{ height: "42px" }}
                    >
                      <span className="w-2 h-2 rounded-full bg-amber-400 flex-shrink-0" />
                      <span
                        className="text-xs truncate whitespace-nowrap"
                        style={{ color: "#64748B", fontFamily: "Outfit, sans-serif" }}
                      >
                        Event Driven · AI Action
                      </span>
                    </div>
                  </div>
                ) : null}

                {/* Column 3 — Delay */}
                {(stepTrigger === "stage" || stepTrigger === "postcall") && (
                  <div className="w-[150px] flex-shrink-0">
                    <div className="flex items-center gap-1.5 mb-2">
                      <label
                        className="text-sm font-semibold"
                        style={{ color: "#020817", fontFamily: "DM Sans, sans-serif" }}
                      >
                        Delay
                      </label>
                      <InfoTooltip text="Time to wait after the previous step finishes before this one runs." />
                    </div>
                    <div className="flex items-center border border-border rounded-lg bg-white overflow-hidden">
                      <input
                        type="number"
                        value={delayValue}
                        onChange={(e) =>
                          onDelayValueChange(parseInt(e.target.value) || 0)
                        }
                        className="w-16 px-3 py-2.5 text-sm outline-none bg-transparent border-none"
                        style={{ fontFamily: "Outfit, sans-serif", color: "#020817" }}
                      />
                      <div className="w-px h-5 bg-gray-300 flex-shrink-0" />
                      <select
                        value={delayUnit}
                        onChange={(e) => onDelayUnitChange(e.target.value)}
                        className="px-3 py-2.5 text-sm bg-transparent border-none outline-none hover:bg-gray-50 transition-colors"
                        style={{ fontFamily: "Outfit, sans-serif", color: "#020817" }}
                      >
                        {["Second", "Minute", "Hour", "Day", "Week", "Month"].map(
                          (unit) => (
                            <option key={unit} value={unit}>
                              {unit}
                            </option>
                          )
                        )}
                      </select>
                    </div>
                  </div>
                )}
              </div>

              {/* Connect After dropdown */}
              {(stepTrigger === "stage" || stepTrigger === "postcall") && executionType === "wait" && (
                <div className="w-full">
                  <div className="flex items-center gap-1.5 mb-2">
                    <label
                      className="text-sm font-semibold"
                      style={{ color: "#020817", fontFamily: "DM Sans, sans-serif" }}
                    >
                      Connect After
                    </label>
                    <InfoTooltip text="Choose which step must finish before this one starts. Leave as 'Start of flow' to run it first." />
                  </div>
                  <select
                    value={connectAfterId || "start"}
                    onChange={(e) => {
                      const val = e.target.value;
                      onConnectAfterIdChange(val === "start" ? undefined : val);
                    }}
                    className="w-full max-w-[360px] px-3 py-2.5 text-sm bg-white border border-border rounded-lg outline-none hover:bg-gray-50 transition-colors"
                    style={{ fontFamily: "Outfit, sans-serif", color: "#020817" }}
                  >
                    <option value="start">Start of flow</option>
                    {availablePredecessors.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.label}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </>
          )}

          {/* Wait / Delay step configuration */}
          {(step.stepKey === "wait" || step.stepKey === "delay") ? (
            <div className="space-y-4 bg-gray-50/50 p-5 rounded-xl border border-gray-200">
              <h3 className="text-sm font-bold text-gray-900">Wait Duration</h3>
              <p className="text-xs text-gray-500">
                Specify how long to pause before executing subsequent actions in this workflow.
              </p>
              <div className="flex items-center gap-3">
                <input
                  type="number"
                  min="1"
                  value={params.delayValue ?? delayValue ?? 15}
                  onChange={(e) => {
                    const val = parseInt(e.target.value) || 0;
                    onParamsChange({ delayValue: val });
                    onDelayValueChange(val);
                  }}
                  className="w-28 px-3.5 py-2.5 text-sm font-semibold border border-gray-200 rounded-lg outline-none focus:border-blue-500 bg-white"
                />
                <select
                  value={params.delayUnit ?? delayUnit ?? "minutes"}
                  onChange={(e) => {
                    onParamsChange({ delayUnit: e.target.value });
                    onDelayUnitChange(e.target.value);
                  }}
                  className="px-3.5 py-2.5 text-sm font-semibold border border-gray-200 rounded-lg bg-white outline-none focus:border-blue-500 cursor-pointer"
                >
                  <option value="seconds">Seconds</option>
                  <option value="minutes">Minutes</option>
                  <option value="hours">Hours</option>
                  <option value="days">Days</option>
                </select>
              </div>
            </div>
          ) : (
            /* ───────────── CONDITIONS + PARAMETERS (shared component) ───────────── */
            <StepParametersFields
              stepKey={step.stepKey ?? ""}
              params={params}
              onChange={onParamsChange}
              processes={processes}
              stepTrigger={stepTrigger}
              scopingRules={scopingRules}
            />
          )}
        </div>

        {/* Footer */}
        <div className="flex-shrink-0 border-t border-border px-6 py-4 flex justify-start gap-3">
          <button
            onClick={onBack}
            className="px-5 py-2 text-sm rounded-md border border-border hover:bg-muted/30 transition-colors"
            style={{ fontFamily: "DM Sans, sans-serif", color: "#64748B" }}
          >
            Back
          </button>
          <button
            onClick={onSave}
            className="px-5 py-2 text-sm rounded-md text-white transition-colors hover:opacity-90"
            style={{ backgroundColor: "#2563EB", fontFamily: "DM Sans, sans-serif" }}
          >
            Save Changes
          </button>
        </div>
      </div>

      {/* Execution Timing Modal */}
      {executionTimingModalOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setExecutionTimingModalOpen(false)}
          />
          {/* Modal */}
          <div
            className="relative bg-white rounded-lg shadow-xl"
            style={{ width: "500px", maxWidth: "90vw" }}
          >
            {/* Header */}
            <div className="px-6 pt-6 pb-4 border-b border-border">
              <h3
                className="text-lg font-bold"
                style={{ color: "#020817", fontFamily: "DM Sans, sans-serif" }}
              >
                Execution Timing
              </h3>
            </div>
            {/* Body */}
            <div className="px-6 py-4 space-y-3">
              <label className="flex items-start gap-3 p-3 rounded-md border border-border cursor-pointer hover:bg-muted/20 transition-colors">
                <input
                  type="radio"
                  name="executionType"
                  checked={executionType === "wait"}
                  onChange={() => onExecutionTypeChange("wait")}
                  className="mt-0.5"
                />
                <div>
                  <p
                    className="text-sm font-semibold"
                    style={{ color: "#020817", fontFamily: "DM Sans, sans-serif" }}
                  >
                    Wait
                  </p>
                  <p
                    className="text-xs mt-0.5"
                    style={{ color: "#64748B", fontFamily: "Outfit, sans-serif" }}
                  >
                    This automation step will start only after the previous step
                    has completed execution.
                  </p>
                </div>
              </label>
              <label className="flex items-start gap-3 p-3 rounded-md border border-border cursor-pointer hover:bg-muted/20 transition-colors">
                <input
                  type="radio"
                  name="executionType"
                  checked={executionType === "parallel"}
                  onChange={() => onExecutionTypeChange("parallel")}
                  className="mt-0.5"
                />
                <div>
                  <p
                    className="text-sm font-semibold"
                    style={{ color: "#020817", fontFamily: "DM Sans, sans-serif" }}
                  >
                    In Parallel
                  </p>
                  <p
                    className="text-xs mt-0.5"
                    style={{ color: "#64748B", fontFamily: "Outfit, sans-serif" }}
                  >
                    This automation step will run independently alongside other
                    active workflow steps.
                  </p>
                </div>
              </label>
            </div>
            {/* Footer */}
            <div className="px-6 py-4 border-t border-border flex justify-end gap-3">
              <button
                onClick={() => setExecutionTimingModalOpen(false)}
                className="px-4 py-2 text-sm rounded-md border border-border hover:bg-muted/30 transition-colors"
                style={{ fontFamily: "DM Sans, sans-serif", color: "#64748B" }}
              >
                Cancel
              </button>
              <button
                onClick={() => setExecutionTimingModalOpen(false)}
                className="px-4 py-2 text-sm rounded-md text-white transition-colors hover:opacity-90"
                style={{
                  backgroundColor: "#2563EB",
                  fontFamily: "DM Sans, sans-serif",
                }}
              >
                OK
              </button>
            </div>
          </div>
        </div>
      )}
    </>,
    document.body
  );
}
