import React, { useState } from "react";
import { X, ChevronRight, Info } from "lucide-react";
import { Tooltip } from "../ui/Tooltip";
import StepParametersFields from "./StepParametersFields";
import type { WorkflowStep } from "../../types/workflow";
import { InfoTooltip } from "../help/InfoTooltip";

export interface StepDetailDrawerProps {
  isOpen: boolean;
  step: WorkflowStep | null;
  isCreatingNewStep: boolean;
  stepAllowedTriggers: Record<string, Array<"stage" | "incall" | "postcall">>;
  processes: any[];

  stepTrigger: "stage" | "incall" | "postcall";
  onStepTriggerChange: (t: "stage" | "incall" | "postcall") => void;

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
  onSave: () => void;
}

export default function StepDetailDrawer({
  isOpen,
  step,
  isCreatingNewStep,
  stepAllowedTriggers,
  processes,
  stepTrigger,
  onStepTriggerChange,
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
}: StepDetailDrawerProps) {
  // Local UI-only state — neither caller needs to own this
  const [executionTimingModalOpen, setExecutionTimingModalOpen] = useState(false);

  if (!isOpen || !step) return null;

  const allowedTriggers =
    stepAllowedTriggers[step.stepKey ?? ""] ?? ["stage", "incall", "postcall"];
  const visibleButtons = (
    [
      { key: "stage" as const, label: "On Entering Stage" },
      { key: "incall" as const, label: "In Call" },
      { key: "postcall" as const, label: "Post Call" },
    ] as const
  ).filter((t) => allowedTriggers.includes(t.key));

  const subtitleText =
    stepTrigger === "stage"
      ? "Runs in sequence as part of this stage's step order, with an optional delay."
      : stepTrigger === "incall"
      ? "Fires the moment the AI decides to take this action mid-conversation."
      : "Fires automatically once the call has ended.";

  const isSingle = visibleButtons.length === 1;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40"
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
        className="fixed top-0 right-0 h-screen z-50 flex flex-col bg-white border-l border-border"
        style={{
          width: "50vw",
          minWidth: "50vw",
          maxWidth: "50vw",
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
            <button
              onClick={() => {
                if (isCreatingNewStep) {
                  onBack();
                } else {
                  onClose();
                }
              }}
              className="p-2 rounded hover:bg-muted/40 transition-colors ml-4 flex-shrink-0"
            >
              <X className="w-5 h-5 text-muted-foreground" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-6 space-y-6">
          {/* Trigger, Execution & Delay Row */}
          <div className="flex items-start gap-3">
            {/* Column 1 — Trigger */}
            <div className="flex-shrink-0">
              <label
                className="block text-sm font-semibold mb-2"
                style={{ color: "#020817", fontFamily: "DM Sans, sans-serif" }}
              >
                Trigger
              </label>
              {/* Trigger toggle + conditional info */}
              <div>
                <div className="flex items-center gap-1.5">
                  <div className="inline-flex items-center gap-0 p-1 rounded-lg border border-border bg-muted/20">
                    {visibleButtons.map((t, idx) => (
                      <React.Fragment key={t.key}>
                        {idx > 0 && (
                          <div className="w-px h-5 bg-gray-300 flex-shrink-0 mx-0.5" />
                        )}
                        <button
                          onClick={() => onStepTriggerChange(t.key)}
                          className={`w-[160px] px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                            stepTrigger === t.key
                              ? "bg-primary text-white"
                              : "text-gray-600 hover:text-gray-900"
                          }`}
                          style={{ fontFamily: "Outfit, sans-serif" }}
                        >
                          {t.label}
                        </button>
                      </React.Fragment>
                    ))}
                  </div>
                  {isSingle && (
                    <Tooltip text={subtitleText} placement="top">
                      <Info className="w-3.5 h-3.5 text-gray-400 cursor-help hover:text-gray-600 flex-shrink-0" />
                    </Tooltip>
                  )}
                </div>
                {!isSingle && (
                  <p
                    className="text-xs mt-2"
                    style={{ color: "#64748B", fontFamily: "Outfit, sans-serif" }}
                  >
                    {subtitleText}
                  </p>
                )}
              </div>
            </div>

            {/* Column 2 — Execution */}
            {stepTrigger === "stage" ? (
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
            ) : stepTrigger === "incall" ? (
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

          {/* ───────────── CONDITIONS + PARAMETERS (shared component) ───────────── */}
          <StepParametersFields
            stepKey={step.stepKey ?? ""}
            params={params}
            onChange={onParamsChange}
            processes={processes}
            stepTrigger={stepTrigger}
          />
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
    </>
  );
}
