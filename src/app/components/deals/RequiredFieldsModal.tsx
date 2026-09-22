/**
 * RequiredFieldsModal.tsx
 * Path: src/app/components/deals/RequiredFieldsModal.tsx
 *
 * Dedicated modal dialog presented when a stage is moved manually and there are
 * missing mandatory required fields for the target stage.
 */

import React, { useState, useEffect } from "react";
import { X, ArrowRight, AlertCircle, Calendar, DollarSign, Check, Info } from "lucide-react";
import type { FieldDefinition } from "../../context/FieldRegistryContext";
import type { MissingRequiredField } from "../../../lib/processFieldValidation";
import { isFieldValueEmpty } from "../../../lib/processFieldValidation";

export interface RequiredFieldsModalProps {
  isOpen: boolean;
  onClose: () => void;
  clientName: string;
  clientId: string;
  processName: string;
  targetStageName: string;
  missingFields: MissingRequiredField[];
  allFields: FieldDefinition[];
  initialValues?: Record<string, any>;
  onConfirm: (filledValues: Record<string, any>) => void;
  zIndex?: number;
}

export function RequiredFieldsModal({
  isOpen,
  onClose,
  clientName,
  processName,
  targetStageName,
  missingFields,
  allFields,
  initialValues = {},
  onConfirm,
  zIndex = 9999,
}: RequiredFieldsModalProps) {
  const [formValues, setFormValues] = useState<Record<string, any>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Initialize values from initialValues whenever modal opens or missingFields change
  useEffect(() => {
    if (isOpen) {
      const initial: Record<string, any> = {};
      missingFields.forEach((mf) => {
        const val = initialValues[mf.key];
        initial[mf.key] = val !== undefined && val !== null ? val : "";
      });
      setFormValues(initial);
      setErrors({});
      setIsSubmitting(false);
    }
  }, [isOpen, missingFields, initialValues]);

  // Handle escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleFieldChange = (key: string, value: any) => {
    setFormValues((prev) => ({ ...prev, [key]: value }));
    if (errors[key]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[key];
        return next;
      });
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const newErrors: Record<string, string> = {};

    missingFields.forEach((mf) => {
      const val = formValues[mf.key];
      if (isFieldValueEmpty(val)) {
        newErrors[mf.key] = `${mf.label || mf.key} is required.`;
      }
    });

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setIsSubmitting(true);
    try {
      onConfirm(formValues);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200"
      style={{ zIndex }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl border border-slate-200/80 w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200"
        role="dialog"
        aria-modal="true"
      >
        {/* Header */}
        <div className="px-6 py-4.5 border-b border-slate-100 bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-transparent flex items-start justify-between">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-600 flex items-center justify-center shrink-0 mt-0.5">
              <AlertCircle className="w-5 h-5 stroke-[2.5]" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-base font-bold text-slate-900">
                  Required Fields Needed
                </h3>
                <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold bg-amber-100 text-amber-900 border border-amber-200">
                  {missingFields.length} {missingFields.length === 1 ? "field" : "fields"} required
                </span>
              </div>
              <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                To move <strong className="text-slate-900">{clientName}</strong> to stage{" "}
                <span className="inline-flex items-center px-1.5 py-0.2 rounded bg-blue-50 text-blue-700 font-semibold border border-blue-200 text-[11px]">
                  {targetStageName}
                </span>{" "}
                in <span className="text-slate-700 font-medium">{processName}</span>, please complete the required fields below.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-4">
          {missingFields.map((mf) => {
            const fieldDef = allFields.find((f) => f.key === mf.key);
            const inputType = fieldDef?.inputType || "text";
            const val = formValues[mf.key] ?? "";
            const hasError = Boolean(errors[mf.key]);

            return (
              <div key={mf.key} className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-slate-800 flex items-center gap-1">
                    {mf.label || fieldDef?.label || mf.key}
                    <span className="text-red-500 font-bold">*</span>
                  </label>
                  {fieldDef?.tooltip && (
                    <span className="text-[11px] text-slate-400" title={fieldDef.tooltip}>
                      <Info className="w-3.5 h-3.5" />
                    </span>
                  )}
                </div>

                {/* Field Controls based on type */}
                {inputType === "select" || inputType === "list_select" || inputType === "list" || inputType === "multiselect" ? (
                  <div className="relative">
                    <select
                      value={val}
                      onChange={(e) => handleFieldChange(mf.key, e.target.value)}
                      className={`w-full px-3.5 py-2.5 rounded-xl border text-xs font-medium bg-white focus:outline-none focus:ring-2 transition-all cursor-pointer ${
                        hasError
                          ? "border-red-300 focus:ring-red-400/20 focus:border-red-500"
                          : "border-slate-200 focus:ring-blue-500/20 focus:border-blue-500"
                      }`}
                    >
                      <option value="">Select an option...</option>
                      {fieldDef?.options?.map((opt) => {
                        const optVal = typeof opt === "string" ? opt : opt.value;
                        const optLabel = typeof opt === "string" ? opt : opt.label || opt.value;
                        return (
                          <option key={optVal} value={optVal}>
                            {optLabel}
                          </option>
                        );
                      })}
                    </select>
                  </div>
                ) : inputType === "yes_no" ? (
                  <div className="flex items-center gap-2">
                    {["Yes", "No"].map((opt) => {
                      const isSelected = val === opt;
                      return (
                        <button
                          key={opt}
                          type="button"
                          onClick={() => handleFieldChange(mf.key, opt)}
                          className={`flex-1 py-2 px-3 rounded-xl border text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                            isSelected
                              ? opt === "Yes"
                                ? "bg-emerald-500 text-white border-emerald-600 shadow-2xs"
                                : "bg-rose-500 text-white border-rose-600 shadow-2xs"
                              : "bg-white border-slate-200 text-slate-700 hover:bg-slate-50"
                          }`}
                        >
                          {isSelected && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                          <span>{opt}</span>
                        </button>
                      );
                    })}
                  </div>
                ) : inputType === "textarea" || inputType === "richtext" ? (
                  <textarea
                    value={val}
                    onChange={(e) => handleFieldChange(mf.key, e.target.value)}
                    placeholder={fieldDef?.placeholder || `Enter ${mf.label}...`}
                    rows={3}
                    className={`w-full px-3.5 py-2.5 rounded-xl border text-xs font-medium bg-white focus:outline-none focus:ring-2 transition-all resize-none ${
                      hasError
                        ? "border-red-300 focus:ring-red-400/20 focus:border-red-500"
                        : "border-slate-200 focus:ring-blue-500/20 focus:border-blue-500"
                    }`}
                  />
                ) : inputType === "date" || inputType === "date_time" ? (
                  <div className="relative flex items-center">
                    <input
                      type="date"
                      value={val}
                      onChange={(e) => handleFieldChange(mf.key, e.target.value)}
                      className={`w-full px-3.5 py-2.5 rounded-xl border text-xs font-medium bg-white focus:outline-none focus:ring-2 transition-all ${
                        hasError
                          ? "border-red-300 focus:ring-red-400/20 focus:border-red-500"
                          : "border-slate-200 focus:ring-blue-500/20 focus:border-blue-500"
                      }`}
                    />
                    <Calendar className="w-4 h-4 text-slate-400 absolute right-3 pointer-events-none" />
                  </div>
                ) : inputType === "money" ? (
                  <div className="relative flex items-center">
                    <DollarSign className="w-4 h-4 text-slate-400 absolute left-3 pointer-events-none" />
                    <input
                      type="number"
                      step="any"
                      value={val}
                      onChange={(e) => handleFieldChange(mf.key, e.target.value)}
                      placeholder={fieldDef?.placeholder || "0.00"}
                      className={`w-full pl-9 pr-3.5 py-2.5 rounded-xl border text-xs font-medium bg-white focus:outline-none focus:ring-2 transition-all ${
                        hasError
                          ? "border-red-300 focus:ring-red-400/20 focus:border-red-500"
                          : "border-slate-200 focus:ring-blue-500/20 focus:border-blue-500"
                      }`}
                    />
                  </div>
                ) : inputType === "number" ? (
                  <input
                    type="number"
                    value={val}
                    onChange={(e) => handleFieldChange(mf.key, e.target.value)}
                    placeholder={fieldDef?.placeholder || "Enter number..."}
                    className={`w-full px-3.5 py-2.5 rounded-xl border text-xs font-medium bg-white focus:outline-none focus:ring-2 transition-all ${
                      hasError
                        ? "border-red-300 focus:ring-red-400/20 focus:border-red-500"
                        : "border-slate-200 focus:ring-blue-500/20 focus:border-blue-500"
                    }`}
                  />
                ) : inputType === "email" ? (
                  <input
                    type="email"
                    value={val}
                    onChange={(e) => handleFieldChange(mf.key, e.target.value)}
                    placeholder={fieldDef?.placeholder || "example@email.com"}
                    className={`w-full px-3.5 py-2.5 rounded-xl border text-xs font-medium bg-white focus:outline-none focus:ring-2 transition-all ${
                      hasError
                        ? "border-red-300 focus:ring-red-400/20 focus:border-red-500"
                        : "border-slate-200 focus:ring-blue-500/20 focus:border-blue-500"
                    }`}
                  />
                ) : inputType === "tel" ? (
                  <input
                    type="tel"
                    value={val}
                    onChange={(e) => handleFieldChange(mf.key, e.target.value)}
                    placeholder={fieldDef?.placeholder || "+1 (555) 000-0000"}
                    className={`w-full px-3.5 py-2.5 rounded-xl border text-xs font-medium bg-white focus:outline-none focus:ring-2 transition-all ${
                      hasError
                        ? "border-red-300 focus:ring-red-400/20 focus:border-red-500"
                        : "border-slate-200 focus:ring-blue-500/20 focus:border-blue-500"
                    }`}
                  />
                ) : (
                  <input
                    type="text"
                    value={val}
                    onChange={(e) => handleFieldChange(mf.key, e.target.value)}
                    placeholder={fieldDef?.placeholder || `Enter ${mf.label || "value"}...`}
                    className={`w-full px-3.5 py-2.5 rounded-xl border text-xs font-medium bg-white focus:outline-none focus:ring-2 transition-all ${
                      hasError
                        ? "border-red-300 focus:ring-red-400/20 focus:border-red-500"
                        : "border-slate-200 focus:ring-blue-500/20 focus:border-blue-500"
                    }`}
                  />
                )}

                {hasError && (
                  <p className="text-[11px] text-red-500 font-medium">{errors[mf.key]}</p>
                )}
              </div>
            );
          })}
        </form>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-100 bg-slate-50 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 hover:bg-slate-200/60 rounded-xl transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-md shadow-blue-500/20 hover:shadow-lg hover:shadow-blue-500/30 transition-all cursor-pointer disabled:opacity-50"
          >
            <span>Save & Move Stage</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}

export default RequiredFieldsModal;
