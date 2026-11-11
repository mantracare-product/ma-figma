import React, { useState } from "react";
import { X, GitMerge, FileText, Plus, ArrowUp, ArrowDown, Trash2 } from "lucide-react";
import { FormFlow, FlowStep, saveFlow } from "../../../data/intakeFlows";
import { Form } from "../../../data/forms";
import { toast } from "sonner";

interface FormFlowCreateDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onCreated: (flow: FormFlow) => void;
  availableForms: Form[];
  isAdmin?: boolean;
}

export default function FormFlowCreateDrawer({
  isOpen,
  onClose,
  onCreated,
  availableForms,
  isAdmin = false,
}: FormFlowCreateDrawerProps) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");

  // 1. Welcome Message (configured first)
  const [welcomeMessage, setWelcomeMessage] = useState(
    "Welcome! Please take a moment to complete the following forms before your appointment."
  );

  // 2. Forms chosen via Add Form (marked as required must be optional)
  const [selectedFormSteps, setSelectedFormSteps] = useState<{ formId: number; required: boolean }[]>([]);
  const [formToSelect, setFormToSelect] = useState<number | "">("");
  const [stepIsRequired, setStepIsRequired] = useState(false); // Optional by default

  // 3. Greeting Message / Thank You Message
  const [thankYouMessage, setThankYouMessage] = useState(
    "Thank you for submitting! We have received your details and will follow up shortly."
  );

  const [enabled, setEnabled] = useState(true);
  const [error, setError] = useState("");

  if (!isOpen) return null;

  const handleAddFormStep = () => {
    if (!formToSelect) return;
    const formIdNum = Number(formToSelect);
    if (selectedFormSteps.some((s) => s.formId === formIdNum)) {
      toast.error("This form is already added to the flow.");
      return;
    }
    setSelectedFormSteps((prev) => [
      ...prev,
      { formId: formIdNum, required: stepIsRequired },
    ]);
    setFormToSelect("");
    setStepIsRequired(false);
  };

  const handleRemoveStep = (index: number) => {
    setSelectedFormSteps((prev) => prev.filter((_, i) => i !== index));
  };

  const handleMoveStep = (fromIndex: number, toIndex: number) => {
    setSelectedFormSteps((prev) => {
      const next = [...prev];
      const item = next[fromIndex];
      next.splice(fromIndex, 1);
      next.splice(toIndex, 0, item);
      return next;
    });
  };

  const handleToggleRequired = (index: number) => {
    setSelectedFormSteps((prev) =>
      prev.map((step, i) => (i === index ? { ...step, required: !step.required } : step))
    );
  };

  const handleCreate = () => {
    if (!name.trim()) {
      setError("Please provide a name for this form flow.");
      return;
    }

    const newFlow: FormFlow = {
      id: Date.now(),
      name: name.trim(),
      description: description.trim(),
      groups: ["All Contacts"],
      steps: selectedFormSteps,
      welcomeMessage: welcomeMessage.trim(),
      thankYouMessage: thankYouMessage.trim(),
      senderName: isAdmin ? "Clinic Admin" : "Front Desk",
      hasActiveClients: false,
      createdAt: new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
      enabled,
      showWelcomeStep: true,
      showThankYouStep: true,
    };

    saveFlow(newFlow);
    toast.success(`Form Flow "${newFlow.name}" created!`);
    onCreated(newFlow);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end overflow-hidden select-none">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/40 backdrop-blur-xs transition-opacity duration-300"
        onClick={onClose}
      />

      {/* Slide-out Panel */}
      <div className="relative w-full max-w-[560px] bg-white h-full shadow-2xl flex flex-col z-10 animate-in slide-in-from-right duration-250 border-l border-slate-200">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-white shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-purple-50 text-purple-700 flex items-center justify-center border border-purple-100 shrink-0">
              <GitMerge className="w-4.5 h-4.5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-slate-900 leading-tight" style={{ fontFamily: "Outfit, sans-serif" }}>
                  Create Form Flow
                </h2>
                <span className="px-2 py-0.5 text-[10px] font-semibold bg-purple-50 text-purple-700 rounded-md border border-purple-100" style={{ fontFamily: "JetBrains Mono, monospace" }}>
                  FLOW DRAFT
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5" style={{ fontFamily: "Outfit, sans-serif" }}>
                Sequence forms into a guided step-by-step path for clients
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5 bg-[#F8FAFC]">
          {/* 1. Basic Flow Info */}
          <div className="bg-white rounded-xl p-4.5 border border-slate-200 shadow-2xs space-y-3.5">
            <h3 className="text-xs font-semibold text-slate-800 uppercase tracking-wider" style={{ fontFamily: "Outfit, sans-serif" }}>
              Flow Details
            </h3>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1" style={{ fontFamily: "Outfit, sans-serif" }}>
                Flow Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  if (error) setError("");
                }}
                placeholder="e.g. New Patient Onboarding Flow"
                className={`w-full px-3 py-2 text-xs border rounded-lg outline-none transition-all ${
                  error ? "border-red-500 ring-1 ring-red-500" : "border-slate-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                } bg-white text-slate-900`}
                style={{ fontFamily: "Outfit, sans-serif" }}
                autoFocus
              />
              {error && <p className="text-[11px] text-red-500 mt-1 font-medium">{error}</p>}
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1" style={{ fontFamily: "Outfit, sans-serif" }}>
                Description <span className="text-slate-400 font-normal">(optional)</span>
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Briefly describe the purpose of this flow..."
                rows={2}
                className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 bg-white text-slate-900"
                style={{ fontFamily: "Outfit, sans-serif" }}
              />
            </div>
          </div>

          {/* 2. Welcome Message (FIRST) */}
          <div className="bg-white rounded-xl p-4.5 border border-slate-200 shadow-2xs space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-semibold text-slate-800 uppercase tracking-wider" style={{ fontFamily: "Outfit, sans-serif" }}>
                1. Welcome Message
              </h3>
              <span className="text-[10px] font-semibold text-purple-600 bg-purple-50 px-2 py-0.5 rounded border border-purple-100">
                Always First
              </span>
            </div>
            <p className="text-[11px] text-slate-500">
              The opening greeting screen that clients see before starting the forms.
            </p>
            <textarea
              value={welcomeMessage}
              onChange={(e) => setWelcomeMessage(e.target.value)}
              rows={2}
              className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 bg-white text-slate-900"
              style={{ fontFamily: "Outfit, sans-serif" }}
            />
          </div>

          {/* 3. Forms Selection via Add Form (THEN) */}
          <div className="bg-white rounded-xl p-4.5 border border-slate-200 shadow-2xs space-y-3.5">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xs font-semibold text-slate-800 uppercase tracking-wider" style={{ fontFamily: "Outfit, sans-serif" }}>
                  2. Forms in Flow ({selectedFormSteps.length})
                </h3>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Choose which forms to include in this flow using the Add Form option.
                </p>
              </div>
            </div>

            {/* List of Added Forms */}
            {selectedFormSteps.length === 0 ? (
              <div className="p-4 bg-slate-50 border border-dashed border-slate-200 rounded-xl text-center">
                <p className="text-xs text-slate-400" style={{ fontFamily: "Outfit, sans-serif" }}>
                  No forms added yet. Choose a form below to add it to this flow.
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {selectedFormSteps.map((step, idx) => {
                  const form = availableForms.find((f) => f.id === step.formId);
                  return (
                    <div
                      key={step.formId}
                      className="flex items-center justify-between p-2.5 bg-slate-50 border border-slate-200 rounded-xl gap-2.5"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-5 h-5 rounded-full bg-slate-200 text-slate-700 text-[11px] font-bold flex items-center justify-center shrink-0">
                          {idx + 1}
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-semibold text-slate-900 truncate" style={{ fontFamily: "Outfit, sans-serif" }}>
                            {form?.name ?? `Form #${step.formId}`}
                          </p>
                          <p className="text-[10px] text-slate-400">
                            {form?.fields?.length || form?.fieldCount || 0} fields
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        {/* Required toggle (optional by default) */}
                        <label className="flex items-center gap-1 text-[11px] text-slate-600 font-medium cursor-pointer">
                          <input
                            type="checkbox"
                            checked={step.required}
                            onChange={() => handleToggleRequired(idx)}
                            className="rounded border-slate-300 w-3.5 h-3.5 text-blue-600"
                          />
                          <span>Required</span>
                        </label>

                        {/* Reorder Buttons */}
                        {idx > 0 && (
                          <button
                            type="button"
                            onClick={() => handleMoveStep(idx, idx - 1)}
                            className="p-1 text-slate-400 hover:text-slate-700 rounded hover:bg-slate-200 transition-colors"
                            title="Move up"
                          >
                            <ArrowUp className="w-3 h-3" />
                          </button>
                        )}
                        {idx < selectedFormSteps.length - 1 && (
                          <button
                            type="button"
                            onClick={() => handleMoveStep(idx, idx + 1)}
                            className="p-1 text-slate-400 hover:text-slate-700 rounded hover:bg-slate-200 transition-colors"
                            title="Move down"
                          >
                            <ArrowDown className="w-3 h-3" />
                          </button>
                        )}

                        {/* Delete Step */}
                        <button
                          type="button"
                          onClick={() => handleRemoveStep(idx)}
                          className="p-1 text-red-400 hover:text-red-600 rounded hover:bg-red-50 transition-colors"
                          title="Remove from flow"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Choose Form & Add Form Option */}
            <div className="pt-2 border-t border-slate-100 space-y-2">
              <label className="block text-[11px] font-semibold text-slate-700" style={{ fontFamily: "Outfit, sans-serif" }}>
                Add Form to Flow
              </label>
              <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
                <select
                  value={formToSelect}
                  onChange={(e) => setFormToSelect(e.target.value ? Number(e.target.value) : "")}
                  className="flex-1 min-w-[180px] h-9 px-3 text-xs border border-slate-200 rounded-lg outline-none bg-white text-slate-900 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                  style={{ fontFamily: "Outfit, sans-serif" }}
                >
                  <option value="">Select a form...</option>
                  {availableForms
                    .filter((f) => !selectedFormSteps.some((s) => s.formId === f.id))
                    .map((form) => (
                      <option key={form.id} value={form.id}>
                        {form.name} ({form.fields?.length || form.fieldCount || 0} fields)
                      </option>
                    ))}
                </select>

                <label className="flex items-center gap-1.5 text-xs text-slate-600 cursor-pointer shrink-0">
                  <input
                    type="checkbox"
                    checked={stepIsRequired}
                    onChange={(e) => setStepIsRequired(e.target.checked)}
                    className="rounded border-slate-300 w-3.5 h-3.5 text-blue-600"
                  />
                  <span>Mark as required</span>
                </label>

                <button
                  type="button"
                  onClick={handleAddFormStep}
                  disabled={!formToSelect}
                  className="h-9 px-3.5 bg-slate-900 hover:bg-black text-white text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-colors disabled:opacity-40 disabled:cursor-not-allowed shrink-0 cursor-pointer"
                  style={{ fontFamily: "Outfit, sans-serif" }}
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Form</span>
                </button>
              </div>
            </div>
          </div>

          {/* 4. Greeting Message / Thank You Message (THEN) */}
          <div className="bg-white rounded-xl p-4.5 border border-slate-200 shadow-2xs space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-semibold text-slate-800 uppercase tracking-wider" style={{ fontFamily: "Outfit, sans-serif" }}>
                3. Thank You / Greeting Message
              </h3>
              <span className="text-[10px] font-semibold text-purple-600 bg-purple-50 px-2 py-0.5 rounded border border-purple-100">
                Always Last
              </span>
            </div>
            <p className="text-[11px] text-slate-500">
              The completion message shown to clients once all steps are submitted.
            </p>
            <textarea
              value={thankYouMessage}
              onChange={(e) => setThankYouMessage(e.target.value)}
              rows={2}
              className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 bg-white text-slate-900"
              style={{ fontFamily: "Outfit, sans-serif" }}
            />
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-200 bg-white flex items-center justify-end gap-3 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-700 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors cursor-pointer"
            style={{ fontFamily: "Outfit, sans-serif" }}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleCreate}
            className="px-4 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-black rounded-lg transition-colors flex items-center gap-1.5 shadow-xs cursor-pointer"
            style={{ fontFamily: "Outfit, sans-serif" }}
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Create Form Flow</span>
          </button>
        </div>
      </div>
    </div>
  );
}
